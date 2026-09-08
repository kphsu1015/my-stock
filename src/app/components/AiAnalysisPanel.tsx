"use client";

import { useCallback, useState } from "react";
import type {
  AiAnalyzeResponse,
  AiImpact,
  HistoryResponse,
  RealtimeQuote,
} from "@/lib/types";
import { getOpenAIKey, useOpenAIKey, useOpenAIModel } from "@/lib/openai-key";
import { Card, SectionLabel } from "./ui";

function impactStyle(impact: AiImpact): { color: string; bg: string } {
  if (impact === "利多")
    return {
      color: "var(--color-up)",
      bg: "color-mix(in srgb, var(--color-up) 12%, transparent)",
    };
  if (impact === "利空")
    return {
      color: "var(--color-down)",
      bg: "color-mix(in srgb, var(--color-down) 12%, transparent)",
    };
  return {
    color: "var(--color-flat)",
    bg: "color-mix(in srgb, var(--color-flat) 14%, transparent)",
  };
}

export default function AiAnalysisPanel({
  symbol,
  quote,
  history,
}: {
  symbol: string;
  quote: RealtimeQuote;
  history: HistoryResponse | null;
}) {
  const savedKey = useOpenAIKey();
  const savedModel = useOpenAIModel();
  const hasKey = savedKey.length > 0;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiAnalyzeResponse | null>(null);

  const analyze = useCallback(async () => {
    const key = getOpenAIKey();
    if (!key) {
      setError("尚未設定 OpenAI API Key，請點右上角的設定圖示輸入。");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const recentCloses = (history?.points ?? [])
        .slice(-20)
        .map((p) => ({ date: p.date, close: p.close }));

      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          symbol,
          name: quote.name,
          price: quote.price,
          change: quote.change,
          changePercent: quote.changePercent,
          open: quote.open,
          high: quote.high,
          low: quote.low,
          prevClose: quote.prevClose,
          volume: quote.volume,
          isLive: quote.isLive,
          date: quote.date,
          recentCloses,
          model: savedModel || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setResult(json as AiAnalyzeResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI 分析失敗");
    } finally {
      setLoading(false);
    }
  }, [symbol, quote, history, savedModel]);

  const verdict = result ? impactStyle(result.verdict) : null;

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3">
        <SectionLabel>AI 利多利空分析</SectionLabel>
        <span className="text-[11px] text-faint">OpenAI · 你的金鑰</span>
        <button
          type="button"
          onClick={analyze}
          disabled={loading}
          className="ml-auto rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "分析中…" : result ? "重新分析" : "AI 分析這支股票"}
        </button>
      </div>

      {!hasKey && !error && (
        <p className="mt-3 rounded-lg border border-line bg-surface-2 px-3 py-2 text-[12px] text-muted">
          這是 BYOK 模式：請先點右上角
          <span className="mx-0.5 font-medium text-ink">設定</span>
          輸入你自己的 OpenAI API Key（只存在本機瀏覽器）。
        </p>
      )}

      {error && (
        <p className="mt-3 rounded-lg border border-up/30 bg-up/10 px-3 py-2 text-sm text-up">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="rounded-md px-2.5 py-1 text-sm font-bold"
              style={{ color: verdict!.color, background: verdict!.bg }}
            >
              {result.verdict}
            </span>
            <span className="nums text-[12px] text-faint">
              信心度 {result.confidence}%
            </span>
            <span className="ml-auto text-[11px] text-faint">
              {result.model}
              {result.newsCount > 0
                ? ` · 參考 ${result.newsCount} 則新聞`
                : " · 無新聞脈絡"}
            </span>
          </div>

          {result.summary && (
            <p className="text-[13.5px] leading-relaxed text-ink">
              {result.summary}
            </p>
          )}

          {result.reasons.length > 0 && (
            <ul className="space-y-1.5">
              {result.reasons.map((r, i) => {
                const s = impactStyle(r.impact);
                return (
                  <li
                    key={i}
                    className="flex gap-2 text-[13px] leading-relaxed"
                  >
                    <span
                      className="mt-0.5 h-fit shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold"
                      style={{ color: s.color, background: s.bg }}
                    >
                      {r.impact}
                    </span>
                    <span className="text-muted">{r.point}</span>
                  </li>
                );
              })}
            </ul>
          )}

          <p className="border-t border-line pt-2 text-[11px] text-faint">
            {result.disclaimer}
          </p>
        </div>
      )}
    </Card>
  );
}
