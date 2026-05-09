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

// TODO: API — 비용 카테고리 localStorage → API 교체
// load()            → GET    /api/cost-categories
// addCategory()     → POST   /api/cost-categories
// updateCategory()  → PATCH  /api/cost-categories/:id
// deleteCategory()  → DELETE /api/cost-categories/:id

const STORAGE_KEY = "gureum_cost_categories";
const EVENT_KEY   = "gureum_categories_update";

// ── 로드/저장 ─────────────────────────────────────────────────────
function load(): CostCategoryItem[] {
  if (typeof window === "undefined") return DEFAULT_CATEGORIES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CATEGORIES;
    const saved: CostCategoryItem[] = JSON.parse(raw);
    // 기본 카테고리가 저장 데이터에 없으면 앞에 추가 (새 기본 카테고리 추가 대응)
    const savedIds = new Set(saved.map((c) => c.id));
    const missing = DEFAULT_CATEGORIES.filter((d) => !savedIds.has(d.id));
    return [...missing, ...saved];
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

function save(items: CostCategoryItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(EVENT_KEY));
}

// ── CRUD ─────────────────────────────────────────────────────────
export function getCategories(): CostCategoryItem[] {
  return load();
}

export function getCategoryById(id: string): CostCategoryItem | undefined {
  return load().find((c) => c.id === id);
}

export function addCategory(item: Pick<CostCategoryItem, "label" | "color"> & { isDefault?: boolean }) {
  const items = load();
  const next: CostCategoryItem = {
    id: `cat_${Date.now()}`,
    label: item.label.trim(),
    color: item.color,
    active: true,
    isDefault: item.isDefault ?? false,
  };
  save([...items, next]);
  return next;
}

export function updateCategory(updated: CostCategoryItem) {
  save(load().map((c) => (c.id === updated.id ? updated : c)));
}

export function deleteCategory(id: string) {
  const items = load();
  const target = items.find((c) => c.id === id);
  if (target?.isDefault) return; // 기본 카테고리 삭제 불가
  save(items.filter((c) => c.id !== id));
}

// CATEGORY_META 호환 — 기존 코드에서 CATEGORY_META[key]처럼 쓰던 패턴 대체
export function getCategoryMeta(id: string): { label: string; color: string } {
  const c = getCategoryById(id);
  return c ?? { label: id, color: "#6B7280" };
}

// ── Hook ─────────────────────────────────────────────────────────
export function useCategories() {
  const [categories, setCategories] = useState<CostCategoryItem[]>(DEFAULT_CATEGORIES);

  useEffect(() => {
    const refresh = () => setCategories(load());
    refresh();
    window.addEventListener(EVENT_KEY, refresh);
    return () => window.removeEventListener(EVENT_KEY, refresh);
  }, []);

  const active = categories.filter((c) => c.active);
  return { categories, active };
}
