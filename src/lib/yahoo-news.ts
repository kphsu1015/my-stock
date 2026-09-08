import type { NewsItem } from "./types";

/**
 * Yahoo 股市 個股新聞 RSS — https://tw.stock.yahoo.com/rss?s=<代號>.TW
 * 免 token。依股票代號過濾，回傳約 20 則、zh-TW。
 */
const RSS_BASE = "https://tw.stock.yahoo.com/rss";

function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function pick(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return m ? decodeEntities(m[1]) : "";
}

export async function fetchYahooNews(
  symbol: string,
  limit = 15,
): Promise<NewsItem[]> {
  const url = `${RSS_BASE}?s=${encodeURIComponent(symbol)}.TW`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    next: { revalidate: 300 }, // 新聞快取 5 分鐘
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`Yahoo RSS 回應 ${res.status}`);

  const xml = await res.text();
  const blocks = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];

  return blocks
    .map((m) => {
      const block = m[1];
      const link = pick(block, "link");
      const pub = pick(block, "pubDate");
      const parsed = pub ? new Date(pub) : null;
      const summary = stripTags(pick(block, "description"));
      return {
        title: pick(block, "title"),
        link,
        publishedAt:
          parsed && !Number.isNaN(parsed.getTime())
            ? parsed.toISOString()
            : "",
        summary: summary.length > 120 ? `${summary.slice(0, 120)}…` : summary,
      };
    })
    .filter((it) => it.title && it.link)
    .slice(0, limit);
}
