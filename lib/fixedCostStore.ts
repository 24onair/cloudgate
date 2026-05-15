"use client";

import { useEffect, useState } from "react";
import type { CostCategory } from "./costStore";

export type BillingCycle = "monthly" | "annual";

export interface FixedCostItem {
  id: string;
  name: string;
  category: CostCategory;
  amount: number;
  billingCycle: BillingCycle;
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

const EVENT_KEY = "gureum_fixed_costs_update";

// ── DB row → store 타입 변환 ───────────────────────────────────
function mapRow(row: Record<string, unknown>): FixedCostItem {
  return {
    id:           row.id as string,
    name:         row.name as string,
    category:     row.category as CostCategory,
    amount:       row.amount as number,
    billingCycle: ((row.billing_cycle as string) ?? "monthly") as BillingCycle,
    memo:         (row.memo as string) ?? "",
    active:       (row.active as boolean) ?? true,
    createdAt:    row.created_at as string,
  };
}

// ── 모듈 캐시 ────────────────────────────────────────────────────
let _cache: FixedCostItem[] = [];
let _loaded = false;

async function fetchFromApi(): Promise<FixedCostItem[]> {
  const res = await fetch("/api/fixed-costs");
  if (!res.ok) return [];
  const rows = await res.json() as Record<string, unknown>[];
  return (rows ?? []).map(mapRow);
}

function notify() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT_KEY));
}

// ── 공개 CRUD ────────────────────────────────────────────────────
export function getFixedCosts(): FixedCostItem[] { return _cache; }

export async function addFixedCost(item: Omit<FixedCostItem, "id" | "createdAt">) {
  const res = await fetch("/api/fixed-costs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name:         item.name,
      category:     item.category,
      amount:       item.amount,
      billingCycle: item.billingCycle,
      memo:         item.memo,
      active:       item.active,
    }),
  });
  if (res.ok) {
    const row = await res.json() as Record<string, unknown>;
    const created = mapRow(row);
    _cache = [created, ..._cache];
    notify();
    return created;
  }
  return null;
}

export async function updateFixedCost(updated: FixedCostItem) {
  _cache = _cache.map((i) => (i.id === updated.id ? updated : i));
  notify();
  await fetch(`/api/fixed-costs/${updated.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name:         updated.name,
      category:     updated.category,
      amount:       updated.amount,
      billingCycle: updated.billingCycle,
      memo:         updated.memo,
      active:       updated.active,
    }),
  });
}

export async function removeFixedCost(id: string) {
  _cache = _cache.filter((i) => i.id !== id);
  notify();
  await fetch(`/api/fixed-costs/${id}`, { method: "DELETE" });
}

/** 활성 고정비 월 합계 (연간 항목은 /12 적용) */
export function getMonthlyFixedTotal(): number {
  return _cache
    .filter((i) => i.active)
    .reduce((s, i) => s + monthlyAmount(i), 0);
}

// ── Hook ────────────────────────────────────────────────────────
export function useFixedCosts() {
  const [items, setItems] = useState<FixedCostItem[]>(_cache);

  useEffect(() => {
    const refresh = () => setItems([..._cache]);
    window.addEventListener(EVENT_KEY, refresh);

    if (!_loaded) {
      _loaded = true;
      fetchFromApi().then((data) => {
        _cache = data;
        notify();
      });
    } else {
      refresh();
    }

    return () => window.removeEventListener(EVENT_KEY, refresh);
  }, []);

  const activeTotal = items
    .filter((i) => i.active)
    .reduce((s, i) => s + monthlyAmount(i), 0);

  return { items, activeTotal };
}
