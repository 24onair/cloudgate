"use client";

import { useEffect, useState } from "react";
import type { CostCategory } from "./costStore";

export type BillingCycle = "monthly" | "annual";

export interface FixedCostItem {
  id: string;
  name: string;
  category: CostCategory;
  amount: number;              // 입력 금액 (월 또는 연간 — billingCycle에 따라 다름)
  billingCycle: BillingCycle;  // "monthly" | "annual"
  memo: string;
  active: boolean;
  createdAt: string;
}

/** 항목의 월 환산 금액 */
export function monthlyAmount(item: FixedCostItem): number {
  return item.billingCycle === "annual"
    ? Math.round(item.amount / 12)
    : item.amount;
}

const STORAGE_KEY = "gureum_fixed_costs";
const EVENT_KEY   = "gureum_fixed_costs_update";

// ── 기본 샘플 ────────────────────────────────────────────────────
const DEFAULT_ITEMS: FixedCostItem[] = [
  {
    id: "fc_ins",
    name: "탠덤 항공보험",
    category: "insurance",
    amount: 350000,
    billingCycle: "monthly",
    memo: "월 정기 납부",
    active: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "fc_site",
    name: "사이트 임차료",
    category: "other",
    amount: 200000,
    billingCycle: "monthly",
    memo: "이륙장 월 임대",
    active: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];

// ── 내부 로드/저장 ───────────────────────────────────────────────
function load(): FixedCostItem[] {
  if (typeof window === "undefined") return DEFAULT_ITEMS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ITEMS;
    // 구버전 데이터 호환: billingCycle 없으면 monthly로 처리
    const parsed: FixedCostItem[] = JSON.parse(raw);
    return parsed.map((i) => ({ ...i, billingCycle: i.billingCycle ?? "monthly" }));
  } catch {
    return DEFAULT_ITEMS;
  }
}

function save(items: FixedCostItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(EVENT_KEY));
}

// ── CRUD ────────────────────────────────────────────────────────
export function getFixedCosts(): FixedCostItem[] {
  return load();
}

export function addFixedCost(item: Omit<FixedCostItem, "id" | "createdAt">) {
  const items = load();
  const next: FixedCostItem = {
    ...item,
    id: `fc_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  save([next, ...items]);
  return next;
}

export function updateFixedCost(updated: FixedCostItem) {
  save(load().map((i) => (i.id === updated.id ? updated : i)));
}

export function removeFixedCost(id: string) {
  save(load().filter((i) => i.id !== id));
}

/** 활성 고정비 월 합계 (연간 항목은 /12 적용) */
export function getMonthlyFixedTotal(): number {
  return load()
    .filter((i) => i.active)
    .reduce((s, i) => s + monthlyAmount(i), 0);
}

// ── Hook ────────────────────────────────────────────────────────
export function useFixedCosts() {
  const [items, setItems] = useState<FixedCostItem[]>(DEFAULT_ITEMS);

  useEffect(() => {
    const refresh = () => setItems(load());
    refresh();
    window.addEventListener(EVENT_KEY, refresh);
    return () => window.removeEventListener(EVENT_KEY, refresh);
  }, []);

  // activeTotal = 월 환산 합계
  const activeTotal = items
    .filter((i) => i.active)
    .reduce((s, i) => s + monthlyAmount(i), 0);

  return { items, activeTotal };
}
