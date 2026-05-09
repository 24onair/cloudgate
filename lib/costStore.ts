"use client";

import { useEffect, useState } from "react";
import { getCategoryMeta } from "./categoryStore";

// CostCategory는 이제 string (동적 카테고리 지원)
export type CostCategory = string;

export type CostType = "variable" | "fixed";

export interface CostEntry {
  id: string;
  date: string;          // "YYYY-MM-DD"
  category: CostCategory;
  costType?: CostType;   // 고정비 | 변동비 (기본: variable)
  name: string;
  amount: number;
  memo: string;
  receiptDataUrl: string | null; // base64 이미지
  createdAt: string;
}

// TODO: API — 비용 항목 localStorage → API 교체
// load()       → GET    /api/costs (query: ?date=YYYY-MM-DD)
// addCost()    → POST   /api/costs
// removeCost() → DELETE /api/costs/:id

const STORAGE_KEY = "gureum_costs";
const EVENT_KEY   = "gureum_costs_update";

// CATEGORY_META — 하위 호환용, categoryStore에서 동적으로 읽음
export const CATEGORY_META = new Proxy({} as Record<string, { label: string; color: string }>, {
  get(_target, key: string) {
    return getCategoryMeta(key);
  },
});

// ── CRUD ────────────────────────────────────────────────────────
function load(): CostEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function save(entries: CostEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  window.dispatchEvent(new Event(EVENT_KEY));
}

export function addCost(entry: Omit<CostEntry, "id" | "createdAt">) {
  const entries = load();
  const next: CostEntry = {
    ...entry,
    costType: entry.costType ?? "variable",
    id: `c_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  save([next, ...entries]);
  return next;
}

export function removeCost(id: string) {
  save(load().filter((e) => e.id !== id));
}

export function getCosts(): CostEntry[] {
  return load();
}

export function getCostsByDate(date: string): CostEntry[] {
  return load().filter((e) => e.date === date);
}

// ── Hook ─────────────────────────────────────────────────────────
export function useCosts(date?: string) {
  const [entries, setEntries] = useState<CostEntry[]>([]);

  useEffect(() => {
    const refresh = () =>
      setEntries(date ? getCostsByDate(date) : getCosts());
    refresh();
    window.addEventListener(EVENT_KEY, refresh);
    return () => window.removeEventListener(EVENT_KEY, refresh);
  }, [date]);

  return entries;
}
