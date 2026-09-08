import { NextRequest, NextResponse } from "next/server";
import {
  fetchForeignHolding,
  fetchInstitutional,
  fetchMargin,
} from "@/lib/finmind";
import type { ChipsResponse } from "@/lib/types";

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

/**
 * GET /api/finmind/chips?symbol=2885&start=&end=
 * 我方後端 API：一次回傳籌碼面三大類（三大法人 / 融資融券 / 外資持股）。
 * start / end 可省略，預設近 90 天。
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const symbol = params.get("symbol")?.trim();
  if (!symbol) {
    return NextResponse.json({ error: "缺少 symbol 參數" }, { status: 400 });
  }

  const start = params.get("start")?.trim() || isoDaysAgo(90);
  const end = params.get("end")?.trim() || isoDaysAgo(0);

  try {
    const [institutional, margin, foreignHolding] = await Promise.all([
      fetchInstitutional(symbol, start, end),
      fetchMargin(symbol, start, end),
      fetchForeignHolding(symbol, start, end),
    ]);

    const body: ChipsResponse = {
      symbol,
      start,
      end,
      institutional,
      margin,
      foreignHolding,
      source: "FinMind",
    };
    return NextResponse.json(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知錯誤";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
