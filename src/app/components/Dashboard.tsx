"use client";

import { useEffect, useState } from "react";
import type { WatchlistResponse } from "@/lib/types";
import { getUserId } from "@/lib/user-id";
import WatchlistCard from "./WatchlistCard";
import StockDetail from "./StockDetail";
import { SectionLabel, Skeleton } from "./ui";

const POLL_MS = 15_000;

const inputCls =
  "rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-faint outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/25";

export default function Dashboard() {
  const [userId] = useState(() => getUserId());
  const [data, setData] = useState<WatchlistResponse | null>(null);
  const [selected, setSelected] = useState<string>("");

  const [addInput, setAddInput] = useState("");
  const [viewInput, setViewInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // 載入 + 盤中輪詢
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      try {
        const res = await fetch(`/api/watchlist?userId=${userId}`);
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(json.error || "載入追蹤清單失敗");
        const next = json as WatchlistResponse;
        setMsg(null);
        setData(next);
        setSelected((prev) => prev || next.items[0]?.symbol || "");
        if (next.items.some((it) => it.quote?.isLive)) {
          timer = setTimeout(poll, POLL_MS);
        }
      } catch (e) {
        if (cancelled) return;
        setMsg(e instanceof Error ? e.message : "載入追蹤清單失敗");
        timer = setTimeout(poll, POLL_MS);
      }
    }

    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [userId]);

  async function addSymbol(raw: string) {
    const symbol = raw.trim();
    if (!symbol || !userId) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/watchlist?userId=${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "加入失敗");
      setData(json as WatchlistResponse);
      setSelected(symbol.toUpperCase());
      setAddInput("");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "加入失敗");
    } finally {
      setBusy(false);
    }
  }

  async function removeSymbol(symbol: string) {
    if (!userId) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(
        `/api/watchlist?userId=${userId}&symbol=${symbol}`,
        { method: "DELETE" },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "移除失敗");
      const next = json as WatchlistResponse;
      setData(next);
      setSelected((prev) =>
        prev === symbol ? (next.items[0]?.symbol ?? "") : prev,
      );
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "移除失敗");
    } finally {
      setBusy(false);
    }
  }

  const updated = data?.updatedAt
    ? new Date(data.updatedAt).toLocaleTimeString("zh-TW", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;

  return (
    <div className="space-y-10">
      {/* 追蹤清單 */}
      <section>
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <SectionLabel>我的追蹤清單</SectionLabel>
          {updated && (
            <span className="nums inline-flex items-center gap-1.5 text-[11px] text-faint">
              <span className="h-1.5 w-1.5 rounded-full bg-down" />
              {updated} 更新
            </span>
          )}
          <form
            className="ml-auto flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              addSymbol(addInput);
            }}
          >
            <input
              value={addInput}
              onChange={(e) => setAddInput(e.target.value)}
              placeholder="加入代號，如 2330"
              className={`${inputCls} w-36`}
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              加入
            </button>
          </form>
        </div>

        {msg && (
          <p className="mb-4 rounded-lg border border-up/30 bg-up/10 px-3.5 py-2.5 text-sm text-up">
            {msg}
          </p>
        )}

        {!data ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-[132px] rounded-[14px]" />
            ))}
          </div>
        ) : data.items.length === 0 ? (
          <div className="card grid place-items-center px-6 py-12 text-center text-sm text-muted">
            追蹤清單是空的 —— 用右上角輸入股票代號加入。
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {data.items.map((item) => (
              <WatchlistCard
                key={item.symbol}
                item={item}
                selected={item.symbol === selected}
                onSelect={() => setSelected(item.symbol)}
                onRemove={() => removeSymbol(item.symbol)}
              />
            ))}
          </div>
        )}
      </section>

      {/* 個股明細 */}
      <section>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <SectionLabel>個股明細</SectionLabel>
          <form
            className="ml-auto flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const v = viewInput.trim();
              if (v) setSelected(v.toUpperCase());
            }}
          >
            <input
              value={viewInput}
              onChange={(e) => setViewInput(e.target.value)}
              placeholder="查看其他代號（不加入清單）"
              className={`${inputCls} w-52`}
            />
            <button
              type="submit"
              className="rounded-lg border border-line-strong px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-2"
            >
              查看
            </button>
          </form>
        </div>

        {selected && <StockDetail key={selected} symbol={selected} />}
      </section>
    </div>
  );
}
