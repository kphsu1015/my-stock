"use client";

import { useEffect, useRef, useState } from "react";
import {
  getOpenAIKey,
  getOpenAIModel,
  maskKey,
  setOpenAIKey,
  setOpenAIModel,
  useOpenAIKey,
} from "@/lib/openai-key";

export default function SettingsButton() {
  const savedKey = useOpenAIKey();
  const configured = savedKey.length > 0;

  const [open, setOpen] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [modelInput, setModelInput] = useState("");
  const [reveal, setReveal] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  function openPanel() {
    setKeyInput(getOpenAIKey());
    setModelInput(getOpenAIModel());
    setReveal(false);
    setFlash(null);
    setOpen(true);
  }

  // 點面板外關閉
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function showFlash(text: string) {
    setFlash(text);
    setTimeout(() => setFlash(null), 1800);
  }

  function save() {
    setOpenAIKey(keyInput);
    setOpenAIModel(modelInput);
    showFlash("已儲存到這個瀏覽器");
  }

  function clear() {
    setOpenAIKey("");
    setOpenAIModel("");
    setKeyInput("");
    setModelInput("");
    showFlash("已清除");
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPanel())}
        aria-label="設定"
        className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:bg-surface-2 hover:text-ink"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 15a3 3 0 100-6 3 3 0 000 6z"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path
            d="M19.4 13a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V20a2 2 0 11-4 0v-.09A1.65 1.65 0 009 17.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 13a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 6.6a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 2.6h.09A1.65 1.65 0 0011 1.09V1a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9v.09a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"
            stroke="currentColor"
            strokeWidth="1.4"
          />
        </svg>
        <span
          className={`absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ring-2 ring-app ${
            configured ? "bg-down" : "bg-faint"
          }`}
        />
      </button>

      {open && (
        <div className="card absolute right-0 top-10 z-50 w-[300px] p-4 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.35)]">
          <p className="text-[13px] font-semibold">OpenAI API Key（BYOK）</p>
          <p className="mt-1 text-[11px] leading-relaxed text-faint">
            使用你自己的 OpenAI 金鑰做 AI 分析。金鑰只會存在這個瀏覽器的
            localStorage，分析時才透過我們的後端即時轉呼叫 OpenAI，我們不保存。
          </p>

          <label className="mt-3 block text-[11px] font-medium text-muted">
            API Key
          </label>
          <div className="mt-1 flex gap-1.5">
            <input
              type={reveal ? "text" : "password"}
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="sk-..."
              autoComplete="off"
              spellCheck={false}
              className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
            />
            <button
              type="button"
              onClick={() => setReveal((v) => !v)}
              className="shrink-0 rounded-lg border border-line px-2 text-[11px] text-muted hover:bg-surface-2"
            >
              {reveal ? "隱藏" : "顯示"}
            </button>
          </div>

          <label className="mt-3 block text-[11px] font-medium text-muted">
            模型（選填，預設 gpt-4o-mini）
          </label>
          <input
            value={modelInput}
            onChange={(e) => setModelInput(e.target.value)}
            placeholder="gpt-4o-mini"
            autoComplete="off"
            spellCheck={false}
            className="mt-1 w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
          />

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={save}
              className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              儲存
            </button>
            <button
              type="button"
              onClick={clear}
              className="rounded-lg border border-line px-3 py-1.5 text-sm text-muted hover:bg-surface-2"
            >
              清除
            </button>
            {flash && <span className="text-[11px] text-down">{flash}</span>}
          </div>

          <p className="mt-3 border-t border-line pt-2 text-[11px] text-faint">
            目前狀態：
            {configured ? (
              <span className="text-down"> 已設定（{maskKey(savedKey)}）</span>
            ) : (
              <span className="text-faint"> 尚未設定</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
