"use client";

import { useState, useEffect } from "react";

export interface Product {
  id: string;
  name: string;
  subtitle: string;
  price: number;
  duration: string;
  color: string;
  popular: boolean;
  active: boolean;
  sortOrder: number;
  images: string[]; // base64 data URLs, max 3
}

export interface ProductOption {
  id: string;
  label: string;
  description: string;
  price: number;
  active: boolean;
}

const EVENT_KEY = "gureum_products_update";

const DEFAULT_PRODUCTS: Product[] = [
  {
    id: "basic",
    name: "베이직",
    subtitle: "첫 패러글라이딩 입문",
    price: 75000,
    duration: "약 10분",
    color: "#2A7AE2",
    popular: false,
    active: true,
    sortOrder: 1,
    images: [],
  },
  {
    id: "extreme",
    name: "익스트림",
    subtitle: "스릴 넘치는 고고도 비행",
    price: 120000,
    duration: "약 20분",
    color: "#FF8A00",
    popular: true,
    active: true,
    sortOrder: 2,
    images: [],
  },
  {
    id: "vip",
    name: "VIP",
    subtitle: "프리미엄 풀 패키지",
    price: 180000,
    duration: "약 30분",
    color: "#8B5CF6",
    popular: false,
    active: true,
    sortOrder: 3,
    images: [],
  },
];

const DEFAULT_OPTIONS: ProductOption[] = [
  { id: "photo", label: "사진 패키지", description: "고프로 사진 30장", price: 30000, active: true },
  { id: "video", label: "영상 촬영", description: "고프로 영상 편집본", price: 20000, active: true },
];

// ── in-memory cache ────────────────────────────────────────────────
let _productsCache: Product[] | null = null;
let _optionsCache: ProductOption[] | null = null;

// ── API helpers ────────────────────────────────────────────────────

function mapDbProduct(row: Record<string, unknown>): Product {
  const durationMin = typeof row.duration_min === "number" ? row.duration_min : 0;
  const slug = String(row.slug ?? "");
  return {
    id: slug || String(row.id ?? ""),  // slug 우선 사용 (PATCH/DELETE 키)
    name: String(row.name ?? ""),
    subtitle: String(row.subtitle ?? ""),
    price: Number(row.price ?? 0),
    duration: durationMin > 0 ? `약 ${durationMin}분` : "",
    color: "#2A7AE2",
    images: [],
    popular: Boolean(row.is_featured ?? false),
    active: Boolean(row.is_active ?? true),
    sortOrder: Number(row.sort_order ?? 0),
  };
}

function mapDbOption(row: Record<string, unknown>): ProductOption {
  return {
    id: String(row.id ?? ""),
    label: String(row.name ?? ""),
    description: String(row.description ?? ""),
    price: Number(row.price ?? 0),
    active: Boolean(row.is_active ?? true),
  };
}

async function loadProductsFromApi(): Promise<Product[]> {
  try {
    // ?all=true — 관리자 스토어는 비활성 상품 포함 전체 로드
    const res = await fetch("/api/products?all=true");
    if (!res.ok) return DEFAULT_PRODUCTS;
    const data = await res.json();
    const products = Array.isArray(data) ? data.map(mapDbProduct) : DEFAULT_PRODUCTS;
    _productsCache = products;
    return products;
  } catch {
    return DEFAULT_PRODUCTS;
  }
}

async function loadOptionsFromApi(): Promise<ProductOption[]> {
  try {
    const res = await fetch("/api/product-options");
    if (!res.ok) return DEFAULT_OPTIONS;
    const data = await res.json();
    const options = Array.isArray(data) ? data.map(mapDbOption) : DEFAULT_OPTIONS;
    _optionsCache = options;
    return options;
  } catch {
    return DEFAULT_OPTIONS;
  }
}

function dispatchUpdate() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT_KEY));
}

// ── Products API ───────────────────────────────────────────────────

// ── sort_order 안전 변환 (PostgreSQL integer 최대값 2147483647 이하로 제한) ──
function safeOrder(n: number): number {
  if (!Number.isFinite(n) || n > 2_147_483_647) {
    // Date.now() 등 거대 값이 들어온 경우 → 기존 최대값 + 1
    const max = Math.max(0, ...(_productsCache ?? []).map((p) => p.sortOrder));
    return Math.min(max + 1, 9999);
  }
  return n;
}

export async function addProduct(product: Product): Promise<void> {
  // optimistic update
  _productsCache = [...(_productsCache ?? DEFAULT_PRODUCTS), product];
  dispatchUpdate();
  try {
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: product.id,
        name: product.name,
        subtitle: product.subtitle,
        price: product.price,
        duration_min: parseInt(product.duration.replace(/[^0-9]/g, ""), 10) || 0,
        is_featured: product.popular,
        is_active: product.active,
        sort_order: safeOrder(product.sortOrder),  // ← integer overflow 방지
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("[productStore] addProduct 실패:", err);
      // 실패 시 캐시 롤백
      _productsCache = null;
      await loadProductsFromApi();
      dispatchUpdate();
      return;
    }
    // 서버 응답으로 캐시 갱신
    _productsCache = null;
    await loadProductsFromApi();
    dispatchUpdate();
  } catch (e) {
    console.error("[productStore] addProduct 네트워크 오류:", e);
    _productsCache = null;
    await loadProductsFromApi();
    dispatchUpdate();
  }
}

export async function updateProduct(updated: Product): Promise<void> {
  // optimistic update
  const prev = _productsCache;
  _productsCache = (_productsCache ?? DEFAULT_PRODUCTS).map((p) =>
    p.id === updated.id ? updated : p
  );
  dispatchUpdate();
  try {
    const res = await fetch("/api/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: updated.id,
        name: updated.name,
        subtitle: updated.subtitle,
        price: updated.price,
        duration_min: parseInt(updated.duration.replace(/[^0-9]/g, ""), 10) || 0,
        is_featured: updated.popular,
        is_active: updated.active,
        sort_order: safeOrder(updated.sortOrder),
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("[productStore] updateProduct 실패:", err);
      // 실패 시 이전 캐시로 롤백
      _productsCache = prev;
      dispatchUpdate();
    } else {
      // 성공 시 서버 데이터로 정확히 동기화
      _productsCache = null;
      await loadProductsFromApi();
      dispatchUpdate();
    }
  } catch (e) {
    console.error("[productStore] updateProduct 네트워크 오류:", e);
    _productsCache = prev;
    dispatchUpdate();
  }
}

export async function deleteProduct(id: string): Promise<void> {
  // optimistic update
  const prev = _productsCache;
  _productsCache = (_productsCache ?? DEFAULT_PRODUCTS).filter((p) => p.id !== id);
  dispatchUpdate();
  try {
    const res = await fetch("/api/products", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      console.error("[productStore] deleteProduct 실패:", await res.json().catch(() => ({})));
      _productsCache = prev;
      dispatchUpdate();
    }
  } catch (e) {
    console.error("[productStore] deleteProduct 네트워크 오류:", e);
    _productsCache = prev;
    dispatchUpdate();
  }
}

// ── Options API ────────────────────────────────────────────────────

export async function addOption(option: ProductOption): Promise<void> {
  // optimistic update
  _optionsCache = [...(_optionsCache ?? DEFAULT_OPTIONS), option];
  dispatchUpdate();
  try {
    await fetch("/api/product-options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: option.label,
        description: option.description,
        price: option.price,
        is_active: option.active,
      }),
    });
    // 서버 응답으로 캐시 갱신
    _optionsCache = null;
    await loadOptionsFromApi();
    dispatchUpdate();
  } catch {
    /* 실패해도 캐시는 유지 */
  }
}

export async function updateOption(updated: ProductOption): Promise<void> {
  // optimistic update
  _optionsCache = (_optionsCache ?? DEFAULT_OPTIONS).map((o) =>
    o.id === updated.id ? updated : o
  );
  dispatchUpdate();
  try {
    await fetch("/api/product-options", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: updated.id,
        name: updated.label,
        description: updated.description,
        price: updated.price,
        is_active: updated.active,
      }),
    });
  } catch {
    /* 실패해도 캐시는 유지 */
  }
}

export async function deleteOption(id: string): Promise<void> {
  // optimistic update
  _optionsCache = (_optionsCache ?? DEFAULT_OPTIONS).filter((o) => o.id !== id);
  dispatchUpdate();
  try {
    await fetch("/api/product-options", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  } catch {
    /* 실패해도 캐시는 유지 */
  }
}

// ── hook ──────────────────────────────────────────────────────────

export function useProducts() {
  const [products, setProducts] = useState<Product[]>(_productsCache ?? DEFAULT_PRODUCTS);
  const [options, setOptions] = useState<ProductOption[]>(_optionsCache ?? DEFAULT_OPTIONS);

  useEffect(() => {
    let mounted = true;

    // 캐시가 없으면 API에서 로드
    if (!_productsCache) {
      loadProductsFromApi().then((d) => {
        if (mounted) setProducts(d);
      });
    }
    if (!_optionsCache) {
      loadOptionsFromApi().then((d) => {
        if (mounted) setOptions(d);
      });
    }

    const refresh = () => {
      if (_productsCache) setProducts([..._productsCache]);
      if (_optionsCache) setOptions([..._optionsCache]);
    };
    window.addEventListener(EVENT_KEY, refresh);
    return () => {
      mounted = false;
      window.removeEventListener(EVENT_KEY, refresh);
    };
  }, []);

  return { products, options };
}
