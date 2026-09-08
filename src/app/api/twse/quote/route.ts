import { NextRequest, NextResponse } from "next/server";
import { fetchTwseQuote } from "@/lib/twse";

/**
 * GET /api/twse/quote?symbol=2885
 * 我們自己的後端 API：對前端封裝 TWSE OpenAPI，回傳現在股價（最近交易日盤後）。
 */
export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim();
  if (!symbol) {
    return NextResponse.json({ error: "缺少 symbol 參數" }, { status: 400 });
  }

  try {
    const quote = await fetchTwseQuote(symbol);
    return NextResponse.json(quote);
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知錯誤";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
