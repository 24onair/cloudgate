"use client";

import { useEffect, useState } from "react";

export type ReviewStatus = "pending" | "approved" | "rejected";

export interface Review {
  id: string;
  name: string;
  avatar: string;       // 이름 첫 글자
  date: string;         // YYYY-MM-DD
  rating: number;       // 1~5
  product: string;
  text: string;
  images: string[];     // base64 dataURL (최대 3장)
  status: ReviewStatus;
  createdAt: string;    // ISO
}

const EVENT_KEY = "gureum_reviews_update";

// ── 캐시 ─────────────────────────────────────────────────────────
let _reviewCache: Review[] | null = null;

function mapRow(row: {
  id: string;
  name: string;
  date?: string;
  rating: number;
  product: string;
  body: string;
  images?: string[];
  status: ReviewStatus;
  created_at: string;
}): Review {
  return {
    id: row.id,
    name: row.name,
    avatar: row.name.charAt(0),
    date: row.date ?? row.created_at.slice(0, 10),
    rating: row.rating,
    product: row.product,
    text: row.body,
    images: row.images ?? [],
    status: row.status,
    createdAt: row.created_at,
  };
}

async function fetchReviews(status?: ReviewStatus): Promise<Review[]> {
  try {
    const url = status ? `/api/reviews?status=${status}` : "/api/reviews";
    const res = await fetch(url);
    if (!res.ok) return [];
    const rows = await res.json();
    return (rows as Parameters<typeof mapRow>[0][]).map(mapRow);
  } catch {
    return [];
  }
}

// ── CRUD ─────────────────────────────────────────────────────────

export async function addReview(r: Omit<Review, "id" | "avatar" | "createdAt" | "status">) {
  const body = {
    name: r.name,
    rating: r.rating,
    product: r.product,
    body: r.text,
    images: r.images,
    status: "pending" as ReviewStatus,
  };

  let newReview: Review = {
    ...r,
    id: `r${Date.now()}`,
    avatar: r.name.charAt(0),
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  try {
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const row = await res.json();
      newReview = mapRow(row);
    }
  } catch {
    // 오류 시 로컬 생성 ID 사용
  }

  if (_reviewCache !== null) {
    _reviewCache = [newReview, ..._reviewCache];
  }
  window.dispatchEvent(new Event(EVENT_KEY));
}

export async function updateReviewStatus(id: string, status: ReviewStatus) {
  try {
    await fetch(`/api/reviews/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  } catch {
    // 오류 시에도 캐시 업데이트
  }
  if (_reviewCache !== null) {
    _reviewCache = _reviewCache.map((r) => (r.id === id ? { ...r, status } : r));
  }
  window.dispatchEvent(new Event(EVENT_KEY));
}

// 기존 setReviewStatus 호환 alias
export const setReviewStatus = updateReviewStatus;

export async function deleteReview(id: string) {
  try {
    await fetch(`/api/reviews/${id}`, { method: "DELETE" });
  } catch {
    // 오류 시에도 캐시에서 제거
  }
  if (_reviewCache !== null) {
    _reviewCache = _reviewCache.filter((r) => r.id !== id);
  }
  window.dispatchEvent(new Event(EVENT_KEY));
}

export function getApprovedReviews(): Review[] {
  return (_reviewCache ?? []).filter((r) => r.status === "approved");
}

// ── Hooks ────────────────────────────────────────────────────────

export function useReviews(status?: ReviewStatus): Review[] {
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    fetchReviews().then((data) => {
      _reviewCache = data;
      setReviews(status ? data.filter((r) => r.status === status) : data);
    });

    const refresh = () => {
      const all = _reviewCache ?? [];
      setReviews(status ? all.filter((r) => r.status === status) : [...all]);
    };
    window.addEventListener(EVENT_KEY, refresh);
    return () => window.removeEventListener(EVENT_KEY, refresh);
  }, [status]);

  return reviews;
}

export function useApprovedReviews(): Review[] {
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    fetchReviews("approved").then((data) => {
      setReviews(data);
    });

    const refresh = () => {
      setReviews((_reviewCache ?? []).filter((r) => r.status === "approved"));
    };
    window.addEventListener(EVENT_KEY, refresh);
    return () => window.removeEventListener(EVENT_KEY, refresh);
  }, []);

  return reviews;
}

export function useAllReviews(): Review[] {
  return useReviews(undefined);
}
