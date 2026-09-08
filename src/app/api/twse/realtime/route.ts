import { NextRequest, NextResponse } from "next/server";
import { fetchRealtimeQuote } from "@/lib/twse-realtime";

/**
 * GET /api/twse/realtime?symbol=2885
 * 我們自己的後端 API：封裝 TWSE MIS 即時報價（盤中約 5 秒更新）。
 * 前端可每 5~10 秒輪詢一次。
 */
export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim();
  if (!symbol) {
    return NextResponse.json({ error: "缺少 symbol 參數" }, { status: 400 });
  }

  try {
    const quote = await fetchRealtimeQuote(symbol);
    return NextResponse.json(quote, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知錯誤";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
