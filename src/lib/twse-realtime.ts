import type { PriceLevel, RealtimeQuote } from "./types";

/**
 * TWSE MIS 即時報價 — https://mis.twse.com.tw/stock/api/getStockInfo.jsp
 * 免 token。盤中約 5 秒更新（依交易所規定有短暫延遲）。
 * 限制：官方約每 5 秒 3 次請求，超過會被暫時封鎖 IP，故加上模組內快取，
 * 並且一次帶多個代號批次查詢，降低請求數。
 */
const MIS_URL = "https://mis.twse.com.tw/stock/api/getStockInfo.jsp";

/** 同代號快取 3 秒，保護上游 rate limit */
const CACHE_TTL_MS = 3_000;
const cache = new Map<string, { at: number; data: RealtimeQuote }>();

interface MisRow {
  c: string;
  n: string;
  ex: string; // "tse" | "otc"
  z: string; // 最新成交價（可能 "-"）
  o: string;
  h: string;
  l: string;
  y: string; // 昨收
  u: string; // 漲停
  w: string; // 跌停
  v: string; // 當日累積成交量（張）
  t: string; // 最後撮合時間 HH:mm:ss
  d: string; // 日期 yyyymmdd
  tlong: string;
  a: string; // 賣出五檔
  b: string; // 買進五檔
  f: string; // 賣量五檔
  g: string; // 買量五檔
}

function n(v: string | undefined): number {
  if (!v || v === "-") return 0;
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function levels(prices?: string, volumes?: string): PriceLevel[] {
  if (!prices) return [];
  const ps = prices.split("_").filter(Boolean);
  const vs = (volumes ?? "").split("_");
  return ps.map((p, i) => ({ price: n(p), volume: n(vs[i]) }));
}

/** "1150904" 或 "20260904" -> "2026-09-04" */
function toISODate(raw?: string): string {
  if (!raw) return "";
  if (raw.length === 8) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }
  const s = raw.padStart(7, "0");
  return `${Number(s.slice(0, 3)) + 1911}-${s.slice(3, 5)}-${s.slice(5, 7)}`;
}

function taipeiToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Taipei" });
}

function parseRow(row: MisRow): RealtimeQuote {
  const prevClose = n(row.y);
  const bids = levels(row.b, row.g);
  const asks = levels(row.a, row.f);

  let price = n(row.z);
  let priceEstimated = false;
  if (!price) {
    const mid =
      bids[0]?.price && asks[0]?.price
        ? (bids[0].price + asks[0].price) / 2
        : bids[0]?.price || asks[0]?.price || 0;
    price = mid || prevClose;
    priceEstimated = true;
  }

  const change = price && prevClose ? price - prevClose : 0;
  const t = row.t || "";
  const dataDate = toISODate(row.d);
  const isLive = !priceEstimated && !!t && dataDate === taipeiToday();

  return {
    symbol: row.c,
    name: (row.n || "").trim(),
    market: row.ex === "otc" ? "otc" : "tse",
    price,
    priceEstimated,
    prevClose,
    open: n(row.o),
    high: n(row.h),
    low: n(row.l),
    limitUp: n(row.u),
    limitDown: n(row.w),
    change,
    changePercent: prevClose ? (change / prevClose) * 100 : 0,
    volume: n(row.v),
    time: t,
    date: dataDate,
    timestamp: n(row.tlong),
    bids,
    asks,
    isLive,
    source: "TWSE-MIS",
  };
}

async function fetchFromMis(symbols: string[]): Promise<RealtimeQuote[]> {
  // 每個代號同時查上市 / 上櫃頻道
  const exCh = symbols
    .flatMap((s) => [`tse_${s}.tw`, `otc_${s}.tw`])
    .join("|");
  const url = `${MIS_URL}?ex_ch=${encodeURIComponent(exCh)}&json=1&delay=0&_=${Date.now()}`;

  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      "User-Agent": "Mozilla/5.0",
      Referer: "https://mis.twse.com.tw/stock/index.jsp",
    },
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`TWSE MIS 回應 ${res.status}`);

  const json = (await res.json()) as { msgArray?: MisRow[] };
  const rows = (json.msgArray ?? []).filter(
    (r) => r.ex === "tse" || r.ex === "otc",
  );
  return rows.map(parseRow);
}

/** 批次即時報價，含每代號 3 秒快取 */
export async function fetchRealtimeQuotes(
  symbols: string[],
): Promise<RealtimeQuote[]> {
  const now = Date.now();
  const cached: RealtimeQuote[] = [];
  const missing: string[] = [];

  for (const s of symbols) {
    const hit = cache.get(s);
    if (hit && now - hit.at < CACHE_TTL_MS) cached.push(hit.data);
    else missing.push(s);
  }

  if (missing.length > 0) {
    const fresh = await fetchFromMis(missing);
    for (const q of fresh) cache.set(q.symbol, { at: now, data: q });
    cached.push(...fresh);
  }

  // 依傳入順序排序
  const order = new Map(symbols.map((s, i) => [s, i]));
  return cached
    .filter((q) => order.has(q.symbol))
    .sort((x, y) => order.get(x.symbol)! - order.get(y.symbol)!);
}

export async function fetchRealtimeQuote(
  symbol: string,
): Promise<RealtimeQuote> {
  const [q] = await fetchRealtimeQuotes([symbol]);
  if (!q) throw new Error(`TWSE MIS 查無股票代號 ${symbol}`);
  return q;
}
