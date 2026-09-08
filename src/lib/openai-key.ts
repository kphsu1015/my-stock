"use client";

import { useSyncExternalStore } from "react";

/**
 * BYOK：使用者自己的 OpenAI API Key 與模型，只暫存在瀏覽器 localStorage，
 * 不會送到我們的資料庫；呼叫 /api/ai/analyze 時才隨標頭帶出去轉呼叫 OpenAI。
 */
const KEY = "my-stock:openai-key";
const MODEL_KEY = "my-stock:openai-model";

/** 金鑰／模型變動時廣播，讓其他元件的 useSyncExternalStore 重新讀取 */
export const OPENAI_CONFIG_EVENT = "my-stock:openai-config-change";

function read(name: string): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(name) ?? "";
  } catch {
    return "";
  }
}

function write(name: string, value: string): void {
  try {
    const v = value.trim();
    if (v) window.localStorage.setItem(name, v);
    else window.localStorage.removeItem(name);
    window.dispatchEvent(new Event(OPENAI_CONFIG_EVENT));
  } catch {
    /* 私密瀏覽 / 停用儲存 —— 忽略 */
  }
}

export function getOpenAIKey(): string {
  return read(KEY);
}

export function setOpenAIKey(value: string): void {
  write(KEY, value);
}

export function getOpenAIModel(): string {
  return read(MODEL_KEY);
}

export function setOpenAIModel(value: string): void {
  write(MODEL_KEY, value);
}

/** 遮罩顯示：sk-abc…WXYZ */
export function maskKey(key: string): string {
  const k = key.trim();
  if (k.length <= 12) return k ? "•".repeat(k.length) : "";
  return `${k.slice(0, 6)}…${k.slice(-4)}`;
}

/* ───────────── React 訂閱（避免在 effect 內同步 setState） ───────────── */

function subscribe(cb: () => void): () => void {
  window.addEventListener(OPENAI_CONFIG_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(OPENAI_CONFIG_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** 目前儲存的 API Key（會隨設定變動即時更新；SSR 時為空字串） */
export function useOpenAIKey(): string {
  return useSyncExternalStore(
    subscribe,
    getOpenAIKey,
    () => "",
  );
}

/** 目前儲存的模型（空字串代表用預設） */
export function useOpenAIModel(): string {
  return useSyncExternalStore(
    subscribe,
    getOpenAIModel,
    () => "",
  );
}
