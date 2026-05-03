"use client";

import { useState, useEffect } from "react";

export interface Product {
  id: string;
  name: string;
  subtitle: string;
  price: number;
  duration: string;
  altitude: string;
  color: string;
  popular: boolean;
  active: boolean;
  maxPax: number;
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

const STORAGE_KEY = "gureum_products";
const OPTIONS_KEY = "gureum_product_options";
const EVENT_KEY = "gureum_products_update";

const DEFAULT_PRODUCTS: Product[] = [
  {
    id: "basic",
    name: "베이직",
    subtitle: "첫 패러글라이딩 입문",
    price: 75000,
    duration: "약 10분",
    altitude: "300m",
    color: "#2A7AE2",
    popular: false,
    active: true,
    maxPax: 4,
    sortOrder: 1,
    images: [],
  },
  {
    id: "extreme",
    name: "익스트림",
    subtitle: "스릴 넘치는 고고도 비행",
    price: 120000,
    duration: "약 20분",
    altitude: "500m",
    color: "#FF8A00",
    popular: true,
    active: true,
    maxPax: 4,
    sortOrder: 2,
    images: [],
  },
  {
    id: "vip",
    name: "VIP",
    subtitle: "프리미엄 풀 패키지",
    price: 180000,
    duration: "약 30분",
    altitude: "800m",
    color: "#8B5CF6",
    popular: false,
    active: true,
    maxPax: 4,
    sortOrder: 3,
    images: [],
  },
];

const DEFAULT_OPTIONS: ProductOption[] = [
  { id: "photo", label: "사진 패키지", description: "고프로 사진 30장", price: 30000, active: true },
  { id: "video", label: "영상 촬영", description: "고프로 영상 편집본", price: 20000, active: true },
];

function loadProducts(): Product[] {
  if (typeof window === "undefined") return DEFAULT_PRODUCTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_PRODUCTS;
  } catch {
    return DEFAULT_PRODUCTS;
  }
}

function saveProducts(data: Product[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  window.dispatchEvent(new Event(EVENT_KEY));
}

function loadOptions(): ProductOption[] {
  if (typeof window === "undefined") return DEFAULT_OPTIONS;
  try {
    const raw = localStorage.getItem(OPTIONS_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_OPTIONS;
  } catch {
    return DEFAULT_OPTIONS;
  }
}

function saveOptions(data: ProductOption[]) {
  localStorage.setItem(OPTIONS_KEY, JSON.stringify(data));
  window.dispatchEvent(new Event(EVENT_KEY));
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>(DEFAULT_PRODUCTS);
  const [options, setOptions] = useState<ProductOption[]>(DEFAULT_OPTIONS);

  useEffect(() => {
    const refresh = () => {
      setProducts(loadProducts());
      setOptions(loadOptions());
    };
    refresh();
    window.addEventListener(EVENT_KEY, refresh);
    return () => window.removeEventListener(EVENT_KEY, refresh);
  }, []);

  return { products, options };
}

export function addProduct(product: Product) {
  const data = loadProducts();
  saveProducts([...data, product]);
}

export function updateProduct(updated: Product) {
  const data = loadProducts().map((p) => (p.id === updated.id ? updated : p));
  saveProducts(data);
}

export function deleteProduct(id: string) {
  const data = loadProducts().filter((p) => p.id !== id);
  saveProducts(data);
}

export function addOption(option: ProductOption) {
  const data = loadOptions();
  saveOptions([...data, option]);
}

export function updateOption(updated: ProductOption) {
  const data = loadOptions().map((o) => (o.id === updated.id ? updated : o));
  saveOptions(data);
}

export function deleteOption(id: string) {
  const data = loadOptions().filter((o) => o.id !== id);
  saveOptions(data);
}
