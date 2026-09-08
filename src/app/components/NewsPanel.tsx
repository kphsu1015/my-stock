"use client";

import { useEffect, useState } from "react";
import type { NewsResponse } from "@/lib/types";
import { Card, SectionLabel, Skeleton } from "./ui";

type ErrState = { symbol: string; message: string } | null;

function timeAgo(iso: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "剛剛";
  if (min < 60) return `${min} 分鐘前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小時前`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} 天前`;
  return new Date(iso).toLocaleDateString("zh-TW");
}

export default function NewsPanel({ symbol }: { symbol: string }) {
  const [data, setData] = useState<NewsResponse | null>(null);
  const [error, setError] = useState<ErrState>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/news?symbol=${symbol}`);
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
        setData(json as NewsResponse);
        setError(null);
      } catch (e) {
        if (!cancelled) {
          setError({
            symbol,
            message: e instanceof Error ? e.message : "載入失敗",
          });
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  if (error?.symbol === symbol)
    return (
      <div className="card border-flat/30 px-4 py-3 text-sm text-flat">
        新聞載入失敗：{error.message}
      </div>
    );
  if (data?.symbol !== symbol)
    return <Skeleton className="h-52 rounded-[14px]" />;

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <SectionLabel>相關新聞</SectionLabel>
        <span className="text-[11px] text-faint">Yahoo 股市</span>
      </div>

      {data.items.length === 0 ? (
        <p className="py-4 text-sm text-faint">目前沒有相關新聞。</p>
      ) : (
        <ul className="-mx-2 divide-y divide-line">
          {data.items.map((it) => (
            <li key={it.link}>
              <a
                href={it.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group block rounded-lg px-2 py-3 transition-colors hover:bg-surface-2"
              >
                <p className="text-[13.5px] font-medium leading-snug decoration-accent/40 underline-offset-2 group-hover:underline">
                  {it.title}
                </p>
                {it.summary && (
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">
                    {it.summary}
                  </p>
                )}
                <p className="mt-1.5 text-[11px] text-faint">
                  {timeAgo(it.publishedAt)}
                </p>
              </a>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
