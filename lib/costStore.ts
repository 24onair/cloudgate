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

const EVENT_KEY = "gureum_costs_update";

// CATEGORY_META — 하위 호환용, categoryStore에서 동적으로 읽음
export const CATEGORY_META = new Proxy({} as Record<string, { label: string; color: string }>, {
  get(_target, key: string) {
    return getCategoryMeta(key);
  },
});

// ── 캐시 ───────────────────────────────────────────────────────────
let _costCache: CostEntry[] | null = null;

function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

async function fetchCosts(month: string): Promise<CostEntry[]> {
  try {
    const res = await fetch(`/api/costs?month=${month}`);
    if (!res.ok) return [];
    const rows = await res.json();
    return (rows as Array<{
      id: string;
      date: string;
      category: string;
      description: string;
      amount: number;
      created_at: string;
      memo?: string;
      cost_type?: CostType;
    }>).map((row) => ({
      id: row.id,
      date: row.date,
      category: row.category,
      costType: row.cost_type ?? "variable",
      name: row.description,
      amount: row.amount,
      memo: row.memo ?? "",
      receiptDataUrl: null,
      createdAt: row.created_at,
    }));
  } catch {
    return [];
  }
}

// ── CRUD ────────────────────────────────────────────────────────
export async function addCost(entry: Omit<CostEntry, "id" | "createdAt">): Promise<CostEntry> {
  const body = {
    date: entry.date,
    category: entry.category,
    description: entry.name,
    amount: entry.amount,
    memo: entry.memo,
    cost_type: entry.costType ?? "variable",
  };

  let newEntry: CostEntry = {
    ...entry,
    costType: entry.costType ?? "variable",
    id: `c_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };

  const res = await fetch("/api/costs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error ?? `변동비 저장 실패 (${res.status})`);
  }
  const row = await res.json();
  newEntry = {
    id: row.id ?? newEntry.id,
    date: row.date ?? entry.date,
    category: row.category ?? entry.category,
    costType: row.cost_type ?? entry.costType ?? "variable",
    name: row.description ?? entry.name,
    amount: row.amount ?? entry.amount,
    memo: row.memo ?? entry.memo ?? "",
    receiptDataUrl: null,
    createdAt: row.created_at ?? newEntry.createdAt,
  };

  if (_costCache !== null) {
    _costCache = [newEntry, ..._costCache];
  }
  window.dispatchEvent(new Event(EVENT_KEY));
  return newEntry;
}

export async function removeCost(id: string): Promise<void> {
  try {
    await fetch(`/api/costs/${id}`, { method: "DELETE" });
  } catch {
    // 오류 시에도 캐시에서 제거
  }
  if (_costCache !== null) {
    _costCache = _costCache.filter((e) => e.id !== id);
  }
  window.dispatchEvent(new Event(EVENT_KEY));
}

export function getCosts(): CostEntry[] {
  return _costCache ?? [];
}

export function getCostsByMonth(yearMonth: string): CostEntry[] {
  return getCosts().filter((e) => e.date.startsWith(yearMonth));
}

export function getCostsByCategory(category: string): CostEntry[] {
  return getCosts().filter((e) => e.category === category);
}

// ── Hook ─────────────────────────────────────────────────────────
export function useCosts() {
  const [entries, setEntries] = useState<CostEntry[]>([]);

  useEffect(() => {
    const month = currentYearMonth();
    fetchCosts(month).then((data) => {
      _costCache = data;
      setEntries([...data]);
    });

    const refresh = () => setEntries([...(_costCache ?? [])]);
    window.addEventListener(EVENT_KEY, refresh);
    return () => window.removeEventListener(EVENT_KEY, refresh);
  }, []);

  return entries;
}
