import { NextRequest, NextResponse } from "next/server";
import { fetchYahooNews } from "@/lib/yahoo-news";
import type { NewsResponse } from "@/lib/types";

/**
 * GET /api/news?symbol=2885&limit=15
 * 我方後端 API：封裝 Yahoo 股市個股新聞 RSS。
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const symbol = params.get("symbol")?.trim();
  if (!symbol) {
    return NextResponse.json({ error: "缺少 symbol 參數" }, { status: 400 });
  }
  const limit = Math.min(Number(params.get("limit")) || 15, 30);

  try {
    const items = await fetchYahooNews(symbol, limit);
    const body: NewsResponse = { symbol, items, source: "Yahoo股市" };
    return NextResponse.json(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知錯誤";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
