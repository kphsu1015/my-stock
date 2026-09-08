import { NextRequest, NextResponse } from "next/server";
import { fetchFinMindHistory } from "@/lib/finmind";
import type { HistoryResponse } from "@/lib/types";

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

/**
 * GET /api/finmind/history?symbol=2885&start=2026-03-01&end=2026-09-06
 * 我們自己的後端 API：對前端封裝 FinMind，回傳歷史日線（畫線圖用）。
 * start / end 可省略，預設抓最近 180 天。
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const symbol = params.get("symbol")?.trim();
  if (!symbol) {
    return NextResponse.json({ error: "缺少 symbol 參數" }, { status: 400 });
  }

  const start = params.get("start")?.trim() || isoDaysAgo(180);
  const end = params.get("end")?.trim() || isoDaysAgo(0);

  try {
    const points = await fetchFinMindHistory(symbol, start, end);
    const body: HistoryResponse = {
      symbol,
      start,
      end,
      points,
      source: "FinMind",
    };
    return NextResponse.json(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知錯誤";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
