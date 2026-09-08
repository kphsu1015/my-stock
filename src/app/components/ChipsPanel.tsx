"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChipsResponse } from "@/lib/types";
import { Card, SectionLabel, Skeleton, chart, toneColor } from "./ui";

const nf = new Intl.NumberFormat("zh-TW");
const shortDate = (d: string) => d.slice(5);

const SERIES = {
  foreign: "#6366f1",
  trust: "#f59e0b",
  dealer: "#14b8a6",
};

type ErrState = { symbol: string; message: string } | null;

const axisTick = { fontSize: 11, fill: chart.axis };

export default function ChipsPanel({ symbol }: { symbol: string }) {
  const [data, setData] = useState<ChipsResponse | null>(null);
  const [error, setError] = useState<ErrState>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/finmind/chips?symbol=${symbol}`);
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
        setData(json as ChipsResponse);
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
        籌碼面載入失敗：{error.message}
      </div>
    );
  if (data?.symbol !== symbol)
    return <Skeleton className="h-64 rounded-[14px]" />;

  const lastInst = data.institutional.at(-1);
  const lastFh = data.foreignHolding.at(-1);

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <SectionLabel>籌碼面</SectionLabel>
        <span className="text-[11px] text-faint">
          近 {data.institutional.length} 交易日 · FinMind
        </span>
      </div>

      {/* 最新一日摘要 */}
      {lastInst && (
        <div className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
          <Metric label="外資" value={lastInst.foreign} unit="張" signed />
          <Metric label="投信" value={lastInst.trust} unit="張" signed />
          <Metric label="自營商" value={lastInst.dealer} unit="張" signed />
          {lastFh && (
            <Metric label="外資持股" value={lastFh.ratio} unit="%" decimals={2} />
          )}
        </div>
      )}

      {/* 三大法人買賣超 */}
      <ChartFrame title="三大法人買賣超（張）">
        <BarChart
          data={data.institutional}
          margin={{ top: 4, right: 6, bottom: 0, left: 0 }}
          stackOffset="sign"
        >
          <CartesianGrid strokeDasharray="2 4" stroke={chart.grid} vertical={false} />
          <XAxis
            dataKey="date"
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            minTickGap={40}
            tickFormatter={shortDate}
          />
          <YAxis tick={axisTick} tickLine={false} axisLine={false} width={52} />
          <Tooltip
            contentStyle={chart.tooltip}
            labelStyle={{ color: "var(--color-muted)" }}
            cursor={{ fill: "var(--color-surface-2)" }}
            formatter={(v, name) => [nf.format(Number(v)), name as string]}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <ReferenceLine y={0} stroke={chart.axis} />
          <Bar dataKey="foreign" name="外資" fill={SERIES.foreign} stackId="a" radius={[2, 2, 0, 0]} />
          <Bar dataKey="trust" name="投信" fill={SERIES.trust} stackId="a" />
          <Bar dataKey="dealer" name="自營商" fill={SERIES.dealer} stackId="a" />
        </BarChart>
      </ChartFrame>

      {/* 融資融券 */}
      <ChartFrame title="融資 / 融券餘額（張）">
        <LineChart
          data={data.margin}
          margin={{ top: 4, right: 6, bottom: 0, left: 0 }}
        >
          <CartesianGrid strokeDasharray="2 4" stroke={chart.grid} vertical={false} />
          <XAxis
            dataKey="date"
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            minTickGap={40}
            tickFormatter={shortDate}
          />
          <YAxis yAxisId="l" tick={axisTick} tickLine={false} axisLine={false} width={56} />
          <YAxis yAxisId="r" orientation="right" tick={axisTick} tickLine={false} axisLine={false} width={44} />
          <Tooltip
            contentStyle={chart.tooltip}
            labelStyle={{ color: "var(--color-muted)" }}
            formatter={(v, name) => [nf.format(Number(v)), name as string]}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line yAxisId="l" type="monotone" dataKey="marginBalance" name="融資餘額" stroke={chart.up} dot={false} strokeWidth={2} />
          <Line yAxisId="r" type="monotone" dataKey="shortBalance" name="融券餘額" stroke={chart.down} dot={false} strokeWidth={2} />
        </LineChart>
      </ChartFrame>

      {/* 外資持股比率 */}
      {data.foreignHolding.length > 0 && (
        <ChartFrame title="外資持股比率（%）" last>
          <LineChart
            data={data.foreignHolding}
            margin={{ top: 4, right: 6, bottom: 0, left: -8 }}
          >
            <defs>
              <linearGradient id="fhLine" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.9} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 4" stroke={chart.grid} vertical={false} />
            <XAxis
              dataKey="date"
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              minTickGap={40}
              tickFormatter={shortDate}
            />
            <YAxis domain={["auto", "auto"]} tick={axisTick} tickLine={false} axisLine={false} width={46} />
            <Tooltip
              contentStyle={chart.tooltip}
              labelStyle={{ color: "var(--color-muted)" }}
              formatter={(v) => [`${Number(v).toFixed(2)}%`, "外資持股"]}
            />
            <Line type="monotone" dataKey="ratio" stroke="#8b5cf6" dot={false} strokeWidth={2} />
          </LineChart>
        </ChartFrame>
      )}
    </Card>
  );
}

function ChartFrame({
  title,
  children,
  last = false,
}: {
  title: string;
  children: React.ReactElement;
  last?: boolean;
}) {
  return (
    <div className={last ? "" : "mb-6"}>
      <p className="mb-2 text-xs font-medium text-muted">{title}</p>
      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  unit,
  signed = false,
  decimals = 0,
}: {
  label: string;
  value: number;
  unit: string;
  signed?: boolean;
  decimals?: number;
}) {
  const tone = signed ? toneColor(value) : undefined;
  const text =
    (signed && value > 0 ? "+" : "") +
    nf.format(Number(value.toFixed(decimals)));
  return (
    <div className="bg-surface px-3 py-2.5">
      <p className="text-[11px] text-faint">{label}</p>
      <p className="nums mt-0.5 text-sm font-semibold" style={{ color: tone }}>
        {text}
        <span className="ml-0.5 text-[11px] font-normal text-faint">
          {unit}
        </span>
      </p>
    </div>
  );
}
