import type {
  ForeignHoldingPoint,
  HistoryPoint,
  InstitutionalPoint,
  MarginPoint,
} from "./types";

/**
 * FinMind Open Data — https://finmind.github.io/
 * 免 token 即可用（300 次/hr）；設定環境變數 FINMIND_TOKEN 可提高到 600 次/hr。
 * 免費會員可用資料集：TaiwanStockPrice / TaiwanStockInstitutionalInvestorsBuySell /
 * TaiwanStockMarginPurchaseShortSale / TaiwanStockShareholding …等。
 * （TaiwanStockHoldingSharesPer 股權分散表、tick snapshot、KBar 分K 需付費會員）
 */
const FINMIND_URL = "https://api.finmindtrade.com/api/v4/data";

interface FinMindResponse<T> {
  msg: string;
  status: number;
  data: T[];
}

/** 共用查詢：dataset + data_id + 日期區間，自動帶入 token 並處理錯誤 */
async function finmindQuery<T>(
  dataset: string,
  dataId: string,
  start: string,
  end: string,
  revalidate = 3600,
): Promise<T[]> {
  const url = new URL(FINMIND_URL);
  url.searchParams.set("dataset", dataset);
  url.searchParams.set("data_id", dataId);
  url.searchParams.set("start_date", start);
  url.searchParams.set("end_date", end);

  const token = process.env.FINMIND_TOKEN;
  if (token) url.searchParams.set("token", token);

  const res = await fetch(url, {
    next: { revalidate },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`FinMind API 回應 ${res.status}`);

  const json = (await res.json()) as FinMindResponse<T>;
  if (json.status !== 200) {
    throw new Error(json.msg || `FinMind ${dataset} 錯誤`);
  }
  return json.data ?? [];
}

/* ───────────── 日線 ───────────── */

interface PriceRow {
  date: string;
  Trading_Volume: number;
  open: number;
  max: number;
  min: number;
  close: number;
}

export async function fetchFinMindHistory(
  symbol: string,
  start: string,
  end: string,
): Promise<HistoryPoint[]> {
  const rows = await finmindQuery<PriceRow>(
    "TaiwanStockPrice",
    symbol,
    start,
    end,
  );
  return rows
    .map((d) => ({
      date: d.date,
      open: d.open,
      high: d.max,
      low: d.min,
      close: d.close,
      volume: d.Trading_Volume,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/* ───────────── 籌碼面：三大法人買賣超 ───────────── */

interface InstitutionalRow {
  date: string;
  name: string;
  buy: number; // 股
  sell: number; // 股
}

const SHARES_PER_LOT = 1000;

export async function fetchInstitutional(
  symbol: string,
  start: string,
  end: string,
): Promise<InstitutionalPoint[]> {
  const rows = await finmindQuery<InstitutionalRow>(
    "TaiwanStockInstitutionalInvestorsBuySell",
    symbol,
    start,
    end,
  );

  const byDate = new Map<string, InstitutionalPoint>();
  for (const r of rows) {
    const p =
      byDate.get(r.date) ??
      ({ date: r.date, foreign: 0, trust: 0, dealer: 0, total: 0 } as InstitutionalPoint);
    const net = (r.buy - r.sell) / SHARES_PER_LOT; // 轉「張」
    switch (r.name) {
      case "Foreign_Investor":
      case "Foreign_Dealer_Self":
        p.foreign += net;
        break;
      case "Investment_Trust":
        p.trust += net;
        break;
      case "Dealer_self":
      case "Dealer_Hedging":
        p.dealer += net;
        break;
    }
    byDate.set(r.date, p);
  }

  return [...byDate.values()]
    .map((p) => ({
      date: p.date,
      foreign: Math.round(p.foreign),
      trust: Math.round(p.trust),
      dealer: Math.round(p.dealer),
      total: Math.round(p.foreign + p.trust + p.dealer),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/* ───────────── 籌碼面：融資融券餘額 ───────────── */

interface MarginRow {
  date: string;
  MarginPurchaseTodayBalance: number; // 張
  MarginPurchaseYesterdayBalance: number;
  ShortSaleTodayBalance: number;
  ShortSaleYesterdayBalance: number;
}

export async function fetchMargin(
  symbol: string,
  start: string,
  end: string,
): Promise<MarginPoint[]> {
  const rows = await finmindQuery<MarginRow>(
    "TaiwanStockMarginPurchaseShortSale",
    symbol,
    start,
    end,
  );
  return rows
    .map((r) => ({
      date: r.date,
      marginBalance: r.MarginPurchaseTodayBalance,
      marginChange:
        r.MarginPurchaseTodayBalance - r.MarginPurchaseYesterdayBalance,
      shortBalance: r.ShortSaleTodayBalance,
      shortChange: r.ShortSaleTodayBalance - r.ShortSaleYesterdayBalance,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/* ───────────── 籌碼面：外資持股比率 ───────────── */

interface ShareholdingRow {
  date: string;
  ForeignInvestmentSharesRatio: number; // %
  ForeignInvestmentShares: number; // 股
}

export async function fetchForeignHolding(
  symbol: string,
  start: string,
  end: string,
): Promise<ForeignHoldingPoint[]> {
  const rows = await finmindQuery<ShareholdingRow>(
    "TaiwanStockShareholding",
    symbol,
    start,
    end,
  );
  return rows
    .map((r) => ({
      date: r.date,
      ratio: r.ForeignInvestmentSharesRatio,
      shares: r.ForeignInvestmentShares,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
