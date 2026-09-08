"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HistoryResponse, PriceLevel, RealtimeQuote } from "@/lib/types";
import AiAnalysisPanel from "./AiAnalysisPanel";
import ChipsPanel from "./ChipsPanel";
import NewsPanel from "./NewsPanel";
import { Card, ChangeBadge, SectionLabel, Skeleton, chart, toneColor } from "./ui";

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json as T;
}

const nf = new Intl.NumberFormat("zh-TW");
const REALTIME_POLL_MS = 8_000;

type ErrState = { symbol: string; message: string } | null;

export default function StockDetail({ symbol }: { symbol: string }) {
  const [rt, setRt] = useState<RealtimeQuote | null>(null);
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [error, setError] = useState<ErrState>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function loadAll() {
      try {
        const [q, h] = await Promise.all([
          getJSON<RealtimeQuote>(`/api/twse/realtime?symbol=${symbol}`),
          getJSON<HistoryResponse>(`/api/finmind/history?symbol=${symbol}`),
        ]);
        if (cancelled) return;
        setRt(q);
        setHistory(h);
        setError(null);
        if (q.isLive) timer = setTimeout(tick, REALTIME_POLL_MS);
      } catch (e) {
        if (!cancelled) {
          setError({
            symbol,
            message: e instanceof Error ? e.message : "載入失敗",
          });
        }
      }
    }

    async function tick() {
      try {
        const q = await getJSON<RealtimeQuote>(
          `/api/twse/realtime?symbol=${symbol}`,
        );
        if (cancelled) return;
        setRt(q);
        if (q.isLive) timer = setTimeout(tick, REALTIME_POLL_MS);
      } catch {
        if (!cancelled) timer = setTimeout(tick, REALTIME_POLL_MS);
      }
    }

    loadAll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [symbol]);

  const stale = history?.symbol !== symbol;
  const hasError = error?.symbol === symbol;
  const loading = stale && !hasError;

  if (hasError) {
    return (
      <div className="card border-up/30 bg-up/5 px-4 py-3 text-sm text-up">
        {error?.message}
      </div>
    );
  }

  if (loading || !rt) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-44 rounded-[14px]" />
        <Skeleton className="h-72 rounded-[14px]" />
      </div>
    );
  }

  const color = toneColor(rt.change);
  const maxDepth = Math.max(
    1,
    ...rt.bids.map((l) => l.volume),
    ...rt.asks.map((l) => l.volume),
  );

  return (
    <div className="space-y-4">
      {/* 報價 hero */}
      <Card>
        <div className="flex flex-wrap items-start gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight">{rt.name}</h2>
              <span className="nums rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium text-muted">
                {rt.symbol} · {rt.market.toUpperCase()}
              </span>
            </div>
          </div>
          <span
            className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
              rt.isLive
                ? "bg-down/12 text-down"
                : "bg-surface-2 text-faint"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                rt.isLive ? "animate-pulse bg-down" : "bg-faint"
              }`}
            />
            {rt.isLive ? `盤中即時 ${rt.time}` : `非交易時段 · ${rt.date} 收盤`}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-end gap-3">
          <span
            className="nums text-4xl font-bold leading-none tracking-tight"
            style={{ color }}
          >
            {rt.price.toFixed(2)}
          </span>
          <ChangeBadge change={rt.change} percent={rt.changePercent} />
          {rt.priceEstimated && (
            <span className="text-[11px] text-faint">參考價（無成交）</span>
          )}
        </div>

        <dl className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-6">
          <Stat label="開盤" value={rt.open.toFixed(2)} />
          <Stat label="最高" value={rt.high.toFixed(2)} tone={toneColor(rt.high - rt.prevClose)} />
          <Stat label="最低" value={rt.low.toFixed(2)} tone={toneColor(rt.low - rt.prevClose)} />
          <Stat label="昨收" value={rt.prevClose.toFixed(2)} />
          <Stat label="漲停" value={rt.limitUp.toFixed(2)} tone="var(--color-up)" />
          <Stat label="跌停" value={rt.limitDown.toFixed(2)} tone="var(--color-down)" />
        </dl>
        <p className="nums mt-2 text-[11px] text-faint">
          成交量 {nf.format(rt.volume)} 張
        </p>

        {(rt.bids.length > 0 || rt.asks.length > 0) && (
          <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-1">
            <p className="text-[11px] font-semibold text-faint">買進</p>
            <p className="text-right text-[11px] font-semibold text-faint">
              賣出
            </p>
            <DepthColumn levels={rt.bids} max={maxDepth} side="bid" />
            <DepthColumn levels={rt.asks} max={maxDepth} side="ask" />
          </div>
        )}
      </Card>

      {/* AI 利多利空分析（BYOK） */}
      <AiAnalysisPanel symbol={symbol} quote={rt} history={history} />

      {/* 走勢 */}
      {history && history.points.length > 0 && (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <SectionLabel>收盤走勢</SectionLabel>
            <span className="text-[11px] text-faint">
              近 {history.points.length} 交易日 · FinMind
            </span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={history.points}
                margin={{ top: 5, right: 8, bottom: 0, left: -8 }}
              >
                <defs>
                  <linearGradient id="detailArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="2 4"
                  stroke={chart.grid}
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: chart.axis }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={44}
                  tickFormatter={(d: string) => d.slice(5)}
                />
                <YAxis
                  domain={["auto", "auto"]}
                  tick={{ fontSize: 11, fill: chart.axis }}
                  tickLine={false}
                  axisLine={false}
                  width={46}
                />
                <Tooltip
                  contentStyle={chart.tooltip}
                  labelStyle={{ color: "var(--color-muted)" }}
                  formatter={(v) => [Number(v).toFixed(2), "收盤"]}
                  labelFormatter={(d) => `${d}`}
                />
                <Area
                  type="monotone"
                  dataKey="close"
                  stroke={color}
                  strokeWidth={2}
                  fill="url(#detailArea)"
                  dot={false}
                  activeDot={{ r: 3 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <NewsPanel symbol={symbol} />
      <ChipsPanel symbol={symbol} />
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="bg-surface px-3 py-2.5">
      <dt className="text-[11px] text-faint">{label}</dt>
      <dd className="nums mt-0.5 text-sm font-semibold" style={{ color: tone }}>
        {value}
      </dd>
    </div>
  );
}

function DepthColumn({
  levels,
  max,
  side,
}: {
  levels: PriceLevel[];
  max: number;
  side: "bid" | "ask";
}) {
  const color =
    side === "bid" ? "var(--color-up)" : "var(--color-down)";
  return (
    <ul className="mt-1 space-y-0.5">
      {levels.map((l, i) => (
        <li
          key={i}
          className="relative flex items-center justify-between overflow-hidden rounded px-2 py-1 text-xs"
        >
          <span
            className="absolute inset-y-0"
            style={{
              [side === "bid" ? "right" : "left"]: 0,
              width: `${(l.volume / max) * 100}%`,
              background: "color-mix(in srgb, " + color + " 12%, transparent)",
            }}
          />
          <span
            className={`nums relative font-semibold ${
              side === "ask" ? "order-2" : ""
            }`}
            style={{ color }}
          >
            {l.price.toFixed(2)}
          </span>
          <span
            className={`nums relative text-faint ${
              side === "ask" ? "order-1" : ""
            }`}
          >
            {l.volume}
          </span>
        </li>
      ))}
    </ul>
  );
}
