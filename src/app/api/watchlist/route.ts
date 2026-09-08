import { NextRequest, NextResponse } from "next/server";
import { fetchRealtimeQuotes, fetchRealtimeQuote } from "@/lib/twse-realtime";
import { fetchFinMindHistory } from "@/lib/finmind";
import { dbConnect } from "@/lib/mongoose";
import { Watchlist, type WatchlistItemDoc } from "@/models/Watchlist";
import {
  DEFAULT_WATCHLIST,
  MAX_WATCHLIST,
  normalizeSymbol,
  isValidSymbolFormat,
} from "@/lib/watchlist";
import type { SparkPoint, WatchlistItem, WatchlistResponse } from "@/lib/types";

export const runtime = "nodejs";

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function getUserId(req: NextRequest): string | null {
  return req.nextUrl.searchParams.get("userId")?.trim() || null;
}

/** 讀取使用者清單；不存在則以預設清單建立 */
async function loadOrSeed(userId: string): Promise<WatchlistItemDoc[]> {
  await dbConnect();
  let doc = await Watchlist.findOne({ userId });
  if (!doc) {
    doc = await Watchlist.create({
      userId,
      items: DEFAULT_WATCHLIST.map((w) => ({
        symbol: w.symbol,
        label: w.label,
        addedAt: new Date(),
      })),
    });
  }
  return doc.items;
}

/** 依清單組合完整回傳（即時報價 + sparkline） */
async function buildPayload(
  listItems: WatchlistItemDoc[],
): Promise<WatchlistResponse> {
  const symbols = listItems.map((i) => i.symbol);

  const [quotes, sparks] = await Promise.all([
    symbols.length ? fetchRealtimeQuotes(symbols).catch(() => []) : [],
    Promise.all(
      symbols.map((s) =>
        fetchFinMindHistory(s, isoDaysAgo(45), isoDaysAgo(0))
          .then((pts): SparkPoint[] =>
            pts.map((p) => ({ date: p.date, close: p.close })),
          )
          .catch((): SparkPoint[] => []),
      ),
    ),
  ]);

  const quoteBySymbol = new Map(quotes.map((q) => [q.symbol, q]));

  const items: WatchlistItem[] = listItems.map((li, i) => {
    const quote = quoteBySymbol.get(li.symbol) ?? null;
    return {
      symbol: li.symbol,
      label: li.label || li.symbol,
      quote,
      spark: sparks[i] ?? [],
      error: quote ? undefined : "即時報價暫時無法取得",
    };
  });

  return { items, updatedAt: new Date().toISOString() };
}

/** GET /api/watchlist?userId=xxx — 取得清單 + 即時資料 */
export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "缺少 userId 參數" }, { status: 400 });
  }
  try {
    const listItems = await loadOrSeed(userId);
    const payload = await buildPayload(listItems);
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知錯誤";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** POST /api/watchlist?userId=xxx  body:{ symbol } — 加入追蹤 */
export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "缺少 userId 參數" }, { status: 400 });
  }

  let body: { symbol?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "無效的請求內容" }, { status: 400 });
  }

  const symbol = normalizeSymbol(body.symbol ?? "");
  if (!symbol || !isValidSymbolFormat(symbol)) {
    return NextResponse.json({ error: "請輸入有效的股票代號" }, { status: 400 });
  }

  try {
    await dbConnect();
    const doc =
      (await Watchlist.findOne({ userId })) ??
      (await Watchlist.create({ userId, items: [] }));

    if (doc.items.some((i) => i.symbol === symbol)) {
      return NextResponse.json(
        { error: `${symbol} 已在追蹤清單中` },
        { status: 409 },
      );
    }
    if (doc.items.length >= MAX_WATCHLIST) {
      return NextResponse.json(
        { error: `追蹤清單最多 ${MAX_WATCHLIST} 檔` },
        { status: 422 },
      );
    }

    // 驗證代號是否存在，並取得中文名稱
    let label = symbol;
    try {
      const quote = await fetchRealtimeQuote(symbol);
      if (quote.name) label = quote.name;
    } catch {
      return NextResponse.json(
        { error: `查無股票代號 ${symbol}` },
        { status: 404 },
      );
    }

    doc.items.push({ symbol, label, addedAt: new Date() });
    await doc.save();

    const payload = await buildPayload(doc.items);
    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知錯誤";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** DELETE /api/watchlist?userId=xxx&symbol=yyy — 移除追蹤 */
export async function DELETE(req: NextRequest) {
  const userId = getUserId(req);
  const symbol = normalizeSymbol(
    req.nextUrl.searchParams.get("symbol") ?? "",
  );
  if (!userId || !symbol) {
    return NextResponse.json(
      { error: "缺少 userId 或 symbol 參數" },
      { status: 400 },
    );
  }

  try {
    await dbConnect();
    const doc = await Watchlist.findOne({ userId });
    if (doc) {
      const idx = doc.items.findIndex((i) => i.symbol === symbol);
      if (idx !== -1) {
        doc.items.splice(idx, 1);
        await doc.save();
      }
    }
    const payload = await buildPayload(doc?.items ?? []);
    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知錯誤";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
