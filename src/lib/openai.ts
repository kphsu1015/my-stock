import type {
  AiAnalyzeRequest,
  AiAnalyzeResponse,
  AiImpact,
  AiReason,
} from "./types";

/**
 * OpenAI 串接（BYOK）—— 金鑰由呼叫端（route handler）從請求標頭取得後傳入，
 * 這裡只負責組 prompt、呼叫 Chat Completions，並把結果正規化成 AiAnalyzeResponse。
 * 後端不儲存任何金鑰。
 */

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o-mini";
const DISCLAIMER = "本分析由 AI 依有限資料生成，僅供參考，不構成投資建議。";

export interface NewsHeadline {
  title: string;
  summary: string;
  publishedAt: string;
}

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    verdict: {
      type: "string",
      enum: ["利多", "利空", "中性"],
      description: "對短期股價的綜合研判",
    },
    confidence: {
      type: "number",
      description: "0~100 的信心度",
    },
    summary: {
      type: "string",
      description: "一段話總結，繁體中文，兩三句內",
    },
    reasons: {
      type: "array",
      description: "支持研判的具體理由，每條一句話",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          point: { type: "string" },
          impact: { type: "string", enum: ["利多", "利空", "中性"] },
        },
        required: ["point", "impact"],
      },
    },
  },
  required: ["verdict", "confidence", "summary", "reasons"],
} as const;

const SYSTEM_PROMPT =
  "你是一位謹慎務實的台股分析助理。依據使用者提供的「當前股價資訊」與「近期新聞標題」，" +
  "研判該股票短期偏向利多、利空還是中性，並用繁體中文說明理由。規則：" +
  "1) 只根據提供的資料推理，絕不編造未提供的數字、財報或消息。" +
  "2) 每條理由要具體、簡短（一句話），並標註它偏利多／利空／中性。" +
  "3) 資料不足時就給「中性」並降低信心度。" +
  "4) 這不是投資建議，語氣保持客觀。";

export async function analyzeStock(
  apiKey: string,
  input: AiAnalyzeRequest,
  news: NewsHeadline[],
): Promise<AiAnalyzeResponse> {
  const model = input.model?.trim() || DEFAULT_MODEL;

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildFacts(input, news) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "stock_signal",
          strict: true,
          schema: RESPONSE_SCHEMA,
        },
      },
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const detail = await safeErr(res);
    if (res.status === 401)
      throw new Error("OpenAI API Key 無效或未授權（401）");
    if (res.status === 429)
      throw new Error("OpenAI 額度不足或呼叫過於頻繁（429）");
    throw new Error(`OpenAI 回應 ${res.status}${detail ? `：${detail}` : ""}`);
  }

  const data = await res.json();
  const raw: string | undefined = data?.choices?.[0]?.message?.content;
  if (!raw) throw new Error("OpenAI 未回傳內容");

  let parsed: {
    verdict?: unknown;
    confidence?: unknown;
    summary?: unknown;
    reasons?: unknown;
  };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("OpenAI 回傳格式無法解析");
  }

  const reasons: AiReason[] = Array.isArray(parsed.reasons)
    ? parsed.reasons
        .slice(0, 8)
        .map((r): AiReason => ({
          point: String((r as AiReason)?.point ?? "").trim(),
          impact: normImpact((r as AiReason)?.impact),
        }))
        .filter((r) => r.point)
    : [];

  return {
    symbol: input.symbol,
    verdict: normImpact(parsed.verdict),
    confidence: clamp(Math.round(Number(parsed.confidence) || 0), 0, 100),
    summary: String(parsed.summary ?? "").trim(),
    reasons,
    model,
    newsCount: news.length,
    disclaimer: DISCLAIMER,
  };
}

function buildFacts(q: AiAnalyzeRequest, news: NewsHeadline[]): string {
  const L: string[] = [];
  L.push(`股票：${q.name ?? ""}（${q.symbol}）`);
  if (q.date)
    L.push(`資料時點：${q.date}${q.isLive ? "（盤中即時）" : "（收盤）"}`);
  if (q.price != null) L.push(`目前價：${q.price}`);
  if (q.change != null && q.changePercent != null)
    L.push(
      `漲跌：${fmtSigned(q.change)}（${fmtSigned(q.changePercent)}%）`,
    );
  if (q.open != null) L.push(`開盤：${q.open}`);
  if (q.high != null) L.push(`最高：${q.high}`);
  if (q.low != null) L.push(`最低：${q.low}`);
  if (q.prevClose != null) L.push(`昨收：${q.prevClose}`);
  if (q.volume != null) L.push(`成交量（張）：${q.volume}`);
  if (q.recentCloses?.length) {
    const seq = q.recentCloses
      .map((p) => `${p.date.slice(5)}=${p.close}`)
      .join("、");
    L.push(`近期收盤（舊→新）：${seq}`);
  }
  L.push("");
  if (news.length) {
    L.push("近期新聞標題：");
    news.forEach((n, i) => {
      L.push(`${i + 1}. ${n.title}${n.summary ? `　—　${n.summary}` : ""}`);
    });
  } else {
    L.push("（目前無可用的新聞標題）");
  }
  return L.join("\n");
}

function fmtSigned(n: number): string {
  return `${n >= 0 ? "+" : ""}${n}`;
}

function normImpact(v: unknown): AiImpact {
  if (v === "利多" || v === "利空" || v === "中性") return v;
  return "中性";
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

async function safeErr(res: Response): Promise<string> {
  try {
    const j = await res.json();
    return String(j?.error?.message ?? j?.error ?? "").slice(0, 200);
  } catch {
    return "";
  }
}
