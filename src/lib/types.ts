// 共用型別：後端 API 與前端共用

/** 現在股價（來源：TWSE OpenAPI，最近一個交易日盤後） */
export interface StockQuote {
  symbol: string;
  name: string;
  /** 交易日 yyyy-mm-dd */
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  /** 漲跌（相對前一交易日收盤） */
  change: number;
  /** 漲跌幅 % */
  changePercent: number;
  /** 成交股數 */
  volume: number;
  /** 成交筆數 */
  transactions: number;
  source: "TWSE";
}

/** 歷史日線單點（來源：FinMind TaiwanStockPrice） */
export interface HistoryPoint {
  /** yyyy-mm-dd */
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  /** 成交股數 */
  volume: number;
}

export interface HistoryResponse {
  symbol: string;
  start: string;
  end: string;
  points: HistoryPoint[];
  source: "FinMind";
}

export interface ApiError {
  error: string;
}

/* ───────────── 即時報價（來源：TWSE MIS，盤中約 5~20 秒更新） ───────────── */

export interface PriceLevel {
  price: number;
  volume: number; // 張
}

export interface RealtimeQuote {
  symbol: string;
  name: string;
  market: "tse" | "otc";
  /** 最新成交價；無成交時以買賣價中價或前一日收盤回補 */
  price: number;
  /** 價格是否為回補值（非真實成交價） */
  priceEstimated: boolean;
  prevClose: number;
  open: number;
  high: number;
  low: number;
  limitUp: number;
  limitDown: number;
  change: number;
  changePercent: number;
  /** 當日累積成交量（張） */
  volume: number;
  /** 資料時間 HH:mm:ss（交易所時間） */
  time: string;
  /** 資料日期 yyyy-mm-dd */
  date: string;
  /** 撮合時間戳（ms） */
  timestamp: number;
  bids: PriceLevel[];
  asks: PriceLevel[];
  /** 是否為盤中即時（false 代表非交易時段，price 為最後收盤） */
  isLive: boolean;
  source: "TWSE-MIS";
}

/* ───────────── 自選股儀表板 ───────────── */

export interface SparkPoint {
  date: string;
  close: number;
}

export interface WatchlistItem {
  symbol: string;
  label: string;
  quote: RealtimeQuote | null;
  spark: SparkPoint[];
  error?: string;
}

export interface WatchlistResponse {
  items: WatchlistItem[];
  updatedAt: string;
}

/* ───────────── 個股新聞（來源：Yahoo 股市 RSS） ───────────── */

export interface NewsItem {
  title: string;
  link: string;
  /** ISO 時間字串 */
  publishedAt: string;
  summary: string;
}

export interface NewsResponse {
  symbol: string;
  items: NewsItem[];
  source: "Yahoo股市";
}

/* ───────────── 籌碼面（來源：FinMind） ───────────── */

/** 三大法人買賣超（單位：張，正買超 / 負賣超） */
export interface InstitutionalPoint {
  date: string;
  foreign: number; // 外資（含外資自營）
  trust: number; // 投信
  dealer: number; // 自營商（自行買賣 + 避險）
  total: number;
}

/** 融資融券餘額（單位：張） */
export interface MarginPoint {
  date: string;
  marginBalance: number; // 融資餘額
  marginChange: number; // 融資增減
  shortBalance: number; // 融券餘額
  shortChange: number; // 融券增減
}

/** 外資持股比率 */
export interface ForeignHoldingPoint {
  date: string;
  ratio: number; // 外資持股比率 %
  shares: number; // 外資持有股數
}

export interface ChipsResponse {
  symbol: string;
  start: string;
  end: string;
  institutional: InstitutionalPoint[];
  margin: MarginPoint[];
  foreignHolding: ForeignHoldingPoint[];
  source: "FinMind";
}

/* ───────────── AI 分析（BYOK：使用者自帶 OpenAI API Key） ───────────── */

export type AiImpact = "利多" | "利空" | "中性";

export interface AiReason {
  /** 一句話理由 */
  point: string;
  impact: AiImpact;
}

/** 前端 POST 給 /api/ai/analyze 的「這支股票目前資訊」 */
export interface AiAnalyzeRequest {
  symbol: string;
  name?: string;
  price?: number;
  change?: number;
  changePercent?: number;
  open?: number;
  high?: number;
  low?: number;
  prevClose?: number;
  volume?: number;
  isLive?: boolean;
  /** 資料日期 yyyy-mm-dd */
  date?: string;
  /** 近期收盤（舊 → 新） */
  recentCloses?: { date: string; close: number }[];
  /** 可選：覆寫 OpenAI 模型（預設 gpt-4o-mini） */
  model?: string;
}

export interface AiAnalyzeResponse {
  symbol: string;
  /** 綜合研判 */
  verdict: AiImpact;
  /** 0~100 信心度 */
  confidence: number;
  summary: string;
  reasons: AiReason[];
  /** 實際使用的模型 */
  model: string;
  /** 參考的新聞標題數 */
  newsCount: number;
  disclaimer: string;
}
