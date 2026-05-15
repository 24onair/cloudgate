"use client";

import { useEffect, useState } from "react";

export interface CostCategoryItem {
  id: string;
  label: string;
  color: string;
  active: boolean;
  isDefault: boolean; // 기본 카테고리는 삭제 불가
}

export const COLOR_OPTIONS = [
  "#2A7AE2", "#FF8A00", "#10B981", "#8B5CF6",
  "#F59E0B", "#EF4444", "#06B6D4", "#EC4899",
  "#14B8A6", "#F97316", "#84CC16", "#6B7280",
];

const DEFAULT_CATEGORIES: CostCategoryItem[] = [
  { id: "salary",      label: "파일럿 급여", color: "#2A7AE2", active: true, isDefault: true },
  { id: "fuel",        label: "연료비",      color: "#FF8A00", active: true, isDefault: true },
  { id: "insurance",   label: "보험료",      color: "#10B981", active: true, isDefault: true },
  { id: "marketing",   label: "마케팅",      color: "#8B5CF6", active: true, isDefault: true },
  { id: "maintenance", label: "장비유지",    color: "#F59E0B", active: true, isDefault: true },
  { id: "other",       label: "기타",        color: "#6B7280", active: true, isDefault: true },
];

const EVENT_KEY = "gureum_categories_update";

// ── DB row → store 타입 변환 ───────────────────────────────────
function mapRow(row: Record<string, unknown>): CostCategoryItem {
  return {
    id:        row.id as string,
    label:     row.label as string,
    color:     (row.color as string) ?? "#6B7280",
    active:    (row.active as boolean) ?? true,
    isDefault: (row.is_default as boolean) ?? false,
  };
}

// ── 모듈 캐시 ────────────────────────────────────────────────────
let _cache: CostCategoryItem[] = DEFAULT_CATEGORIES;
let _loaded = false;

async function fetchFromApi(): Promise<CostCategoryItem[]> {
  const res = await fetch("/api/cost-categories");
  if (!res.ok) return DEFAULT_CATEGORIES;
  const rows = await res.json() as Record<string, unknown>[];
  if (!rows || rows.length === 0) {
    // DB 비어 있으면 기본 카테고리 seed
    await seedDefaults();
    return DEFAULT_CATEGORIES;
  }
  return rows.map(mapRow);
}

async function seedDefaults() {
  for (let i = 0; i < DEFAULT_CATEGORIES.length; i++) {
    const c = DEFAULT_CATEGORIES[i];
    await fetch("/api/cost-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...c, sortOrder: i }),
    });
  }
}

function notify() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT_KEY));
}

// ── 공개 CRUD ────────────────────────────────────────────────────
export function getCategories(): CostCategoryItem[] { return _cache; }

export function getCategoryById(id: string): CostCategoryItem | undefined {
  return _cache.find((c) => c.id === id);
}

export function getCategoryMeta(id: string): { label: string; color: string } {
  const c = getCategoryById(id);
  return c ?? { label: id, color: "#6B7280" };
}

export async function addCategory(item: Pick<CostCategoryItem, "label" | "color"> & { isDefault?: boolean }) {
  const tempId = `cat_${Date.now()}`;
  const next: CostCategoryItem = {
    id: tempId, label: item.label.trim(), color: item.color,
    active: true, isDefault: item.isDefault ?? false,
  };
  _cache = [..._cache, next];
  notify();

  const res = await fetch("/api/cost-categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: tempId, label: next.label, color: next.color, isDefault: next.isDefault, sortOrder: _cache.length }),
  });
  if (res.ok) {
    const row = await res.json() as Record<string, unknown>;
    const created = mapRow(row);
    _cache = _cache.map((c) => (c.id === tempId ? created : c));
    notify();
    return created;
  }
  return next;
}

export async function updateCategory(updated: CostCategoryItem) {
  _cache = _cache.map((c) => (c.id === updated.id ? updated : c));
  notify();
  await fetch(`/api/cost-categories/${updated.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label: updated.label, color: updated.color, active: updated.active }),
  });
}

export async function deleteCategory(id: string) {
  const target = _cache.find((c) => c.id === id);
  if (target?.isDefault) return;
  _cache = _cache.filter((c) => c.id !== id);
  notify();
  await fetch(`/api/cost-categories/${id}`, { method: "DELETE" });
}

// ── Hook ─────────────────────────────────────────────────────────
export function useCategories() {
  const [categories, setCategories] = useState<CostCategoryItem[]>(_cache);

  useEffect(() => {
    const refresh = () => setCategories([..._cache]);
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

  const active = categories.filter((c) => c.active);
  return { categories, active };
}
