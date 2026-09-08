/** 新使用者的預設自選股（金融股）；之後存進 MongoDB，可自行增減 */
export const DEFAULT_WATCHLIST = [
  { symbol: "2885", label: "元大金" },
  { symbol: "2880", label: "華南金" },
  { symbol: "2882", label: "國泰金" },
  { symbol: "2801", label: "彰銀" },
  { symbol: "2886", label: "兆豐金" },
] as const;

/** 一份清單最多幾檔（限制上游 MIS 批次查詢大小） */
export const MAX_WATCHLIST = 30;

/** 代號正規化：去空白、轉大寫（相容 00632R 這類含英文的 ETF 代號） */
export function normalizeSymbol(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isValidSymbolFormat(symbol: string): boolean {
  return /^[0-9]{4,6}[A-Z]?$/.test(symbol);
}
