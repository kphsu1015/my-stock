import type { StockQuote } from "./types";

/**
 * TWSE OpenAPI — 全上市個股當日成交行情（最近一個交易日盤後）
 * 免 token。文件：https://openapi.twse.com.tw/
 */
const STOCK_DAY_ALL =
  "https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL";

interface TwseRow {
  Date: string; // 民國年 yyyMMdd，例如 "1150904"
  Code: string;
  Name: string;
  TradeVolume: string;
  TradeValue: string;
  OpeningPrice: string;
  HighestPrice: string;
  LowestPrice: string;
  ClosingPrice: string;
  Change: string; // 已帶正負號
  Transaction: string;
}

/** "1150904" -> "2026-09-04" */
function rocToISO(roc: string): string {
  const s = roc.padStart(7, "0");
  const year = Number(s.slice(0, 3)) + 1911;
  return `${year}-${s.slice(3, 5)}-${s.slice(5, 7)}`;
}

function num(v: string): number {
  const n = Number(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

export async function fetchTwseQuote(symbol: string): Promise<StockQuote> {
  const res = await fetch(STOCK_DAY_ALL, {
    // 盤後資料，快取 60 秒即可
    next: { revalidate: 60 },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`TWSE OpenAPI 回應 ${res.status}`);

  const rows = (await res.json()) as TwseRow[];
  const row = rows.find((r) => r.Code === symbol);
  if (!row) throw new Error(`TWSE 查無股票代號 ${symbol}`);

  const close = num(row.ClosingPrice);
  const change = num(row.Change);
  const prevClose = close - change;

  return {
    symbol: row.Code,
    name: row.Name.trim(),
    date: rocToISO(row.Date),
    open: num(row.OpeningPrice),
    high: num(row.HighestPrice),
    low: num(row.LowestPrice),
    close,
    change,
    changePercent: prevClose ? (change / prevClose) * 100 : 0,
    volume: num(row.TradeVolume),
    transactions: num(row.Transaction),
    source: "TWSE",
  };
}
