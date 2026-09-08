import { NextRequest, NextResponse } from "next/server";
import { analyzeStock, type NewsHeadline } from "@/lib/openai";
import { fetchYahooNews } from "@/lib/yahoo-news";
import type { AiAnalyzeRequest } from "@/lib/types";

/**
 * POST /api/ai/analyze
 *
 * BYOK：使用者的 OpenAI API Key 由前端放在標頭
 *   Authorization: Bearer <key>   或   x-openai-key: <key>
 * 後端「不」儲存金鑰，只即時轉呼叫 OpenAI。
 *
 * body：AiAnalyzeRequest（這支股票的目前資訊，前端已握有）
 * 後端會額外抓最近新聞標題補充脈絡（失敗不致命）。
 */
export async function POST(req: NextRequest) {
  const apiKey =
    req.headers.get("x-openai-key")?.trim() ||
    req.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "")
      .trim() ||
    "";

  if (!apiKey) {
    return NextResponse.json(
      { error: "缺少 OpenAI API Key，請先在右上角「設定」輸入你的金鑰" },
      { status: 401 },
    );
  }

  let body: AiAnalyzeRequest;
  try {
    body = (await req.json()) as AiAnalyzeRequest;
  } catch {
    return NextResponse.json(
      { error: "請求內容不是有效的 JSON" },
      { status: 400 },
    );
  }

  const symbol = body.symbol?.trim();
  if (!symbol) {
    return NextResponse.json({ error: "缺少 symbol" }, { status: 400 });
  }

  // 補充新聞脈絡 —— 失敗就當作沒有新聞，不阻擋分析
  let news: NewsHeadline[] = [];
  try {
    news = (await fetchYahooNews(symbol, 12)).map((n) => ({
      title: n.title,
      summary: n.summary,
      publishedAt: n.publishedAt,
    }));
  } catch {
    news = [];
  }

  try {
    const result = await analyzeStock(apiKey, { ...body, symbol }, news);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI 分析失敗";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
