import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-16px_rgba(0,0,0,0.12)] ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">
      {children}
    </h3>
  );
}

/** 漲跌顏色 */
export function toneColor(change: number): string {
  if (change > 0) return "var(--color-up)";
  if (change < 0) return "var(--color-down)";
  return "var(--color-flat)";
}

export function ChangeBadge({
  change,
  percent,
  size = "md",
}: {
  change: number;
  percent: number;
  size?: "sm" | "md";
}) {
  const color = toneColor(change);
  const arrow = change > 0 ? "▲" : change < 0 ? "▼" : "—";
  const pad = size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-1 text-xs";
  return (
    <span
      className={`nums inline-flex items-center gap-1 rounded-md font-semibold ${pad}`}
      style={{
        color,
        background: "color-mix(in srgb, currentColor 12%, transparent)",
      }}
    >
      <span>{arrow}</span>
      <span>
        {change >= 0 ? "+" : ""}
        {change.toFixed(2)}
      </span>
      <span className="opacity-70">
        ({percent >= 0 ? "+" : ""}
        {percent.toFixed(2)}%)
      </span>
    </span>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

/** recharts 共用主題（可讀取 CSS 變數，自動跟隨深淺色） */
export const chart = {
  grid: "var(--color-line)",
  axis: "var(--color-faint)",
  tooltip: {
    background: "var(--color-surface)",
    border: "1px solid var(--color-line)",
    borderRadius: 10,
    fontSize: 12,
    color: "var(--color-ink)",
    boxShadow: "0 8px 24px -12px rgba(0,0,0,0.25)",
  },
  up: "var(--color-up)",
  down: "var(--color-down)",
};
