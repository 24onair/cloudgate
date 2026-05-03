"use client";

import { useEffect, useState } from "react";

export type CostCategory =
  | "salary"
  | "fuel"
  | "insurance"
  | "marketing"
  | "maintenance"
  | "other";

export interface CostEntry {
  id: string;
  date: string;          // "YYYY-MM-DD"
  category: CostCategory;
  name: string;
  amount: number;
  memo: string;
  receiptDataUrl: string | null; // base64 이미지
  createdAt: string;
}

const STORAGE_KEY = "gureum_costs";
const EVENT_KEY = "gureum_costs_update";

export const CATEGORY_META: Record<CostCategory, { label: string; color: string }> = {
  salary:      { label: "파일럿 급여", color: "#2A7AE2" },
  fuel:        { label: "연료비",      color: "#FF8A00" },
  insurance:   { label: "보험료",      color: "#10B981" },
  marketing:   { label: "마케팅",      color: "#8B5CF6" },
  maintenance: { label: "장비유지",    color: "#F59E0B" },
  other:       { label: "기타",        color: "#6B7280" },
};

// ── 스토어 CRUD ─────────────────────────────────────────────────
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

// ── 훅 ────────────────────────────────────────────────────────
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
