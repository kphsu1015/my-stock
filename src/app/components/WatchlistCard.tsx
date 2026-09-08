"use client";

import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import type { WatchlistItem } from "@/lib/types";
import { toneColor } from "./ui";

const nf = new Intl.NumberFormat("zh-TW");

export default function WatchlistCard({
  item,
  selected,
  onSelect,
  onRemove,
}: {
  item: WatchlistItem;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const q = item.quote;
  const color = toneColor(q?.change ?? 0);
  const gid = `spark-${item.symbol}`;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`group relative flex cursor-pointer flex-col rounded-[14px] border p-3.5 transition-all duration-150 ${
        selected
          ? "border-accent bg-accent-soft shadow-[0_0_0_1px_var(--color-accent)]"
          : "card hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[0_10px_28px_-16px_rgba(0,0,0,0.25)]"
      }`}
    >
      <button
        type="button"
        aria-label={`移除 ${item.label}`}
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute right-1.5 top-1.5 hidden h-5 w-5 items-center justify-center rounded-md text-faint transition-colors hover:bg-surface-2 hover:text-ink group-hover:flex"
      >
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <path
            d="M1 1l10 10M11 1L1 11"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>

      <div className="flex items-baseline justify-between pr-4">
        <span className="truncate text-[13px] font-semibold">{item.label}</span>
        <span className="nums shrink-0 text-[11px] text-faint">
          {item.symbol}
        </span>
      </div>

      {q ? (
        <>
          <div className="mt-1.5 flex items-end justify-between gap-1">
            <span className="nums text-[22px] font-bold leading-none tracking-tight">
              {q.price.toFixed(2)}
            </span>
          </div>
          <div
            className="nums mt-1 text-[11px] font-semibold"
            style={{ color }}
          >
            {q.change > 0 ? "▲" : q.change < 0 ? "▼" : "—"}{" "}
            {q.change >= 0 ? "+" : ""}
            {q.change.toFixed(2)} ({q.changePercent >= 0 ? "+" : ""}
            {q.changePercent.toFixed(2)}%)
          </div>

          <div className="mt-2 h-9 w-full">
            {item.spark.length > 1 && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={item.spark}
                  margin={{ top: 2, right: 0, bottom: 2, left: 0 }}
                >
                  <defs>
                    <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <YAxis domain={["dataMin", "dataMax"]} hide />
                  <Area
                    type="monotone"
                    dataKey="close"
                    stroke={color}
                    strokeWidth={1.5}
                    fill={`url(#${gid})`}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="nums mt-1 flex items-center justify-between text-[10px] text-faint">
            <span className="inline-flex items-center gap-1">
              {q.isLive && (
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-down" />
              )}
              {q.isLive ? q.time : `${q.date.slice(5)} 收`}
            </span>
            <span>量 {nf.format(q.volume)}</span>
          </div>
        </>
      ) : (
        <p className="mt-3 text-[11px] text-flat">{item.error ?? "無資料"}</p>
      )}
    </div>
  );
}
