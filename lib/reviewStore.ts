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

const STORE_KEY = "gureum_reviews";
const EVENT_KEY = "gureum_reviews_update";

// 초기 시드 데이터 (기존 하드코딩 후기 → approved)
const SEED: Review[] = [
  {
    id: "r1", name: "이수진", avatar: "이", date: "2026-04-28", rating: 5, product: "베이직",
    text: "생애 처음 패러글라이딩인데 파일럿분이 너무 친절하게 설명해 주셔서 무서움 없이 즐길 수 있었어요. 하늘에서 보이는 뷰가 정말 잊지 못할 것 같아요!",
    images: [], status: "approved", createdAt: "2026-04-28T10:00:00Z",
  },
  {
    id: "r2", name: "최현우", avatar: "최", date: "2026-04-29", rating: 5, product: "익스트림",
    text: "스릴 넘치는 비행이었습니다! 고고도 기동할 때 심장이 쫄깃했어요. 사진 패키지도 추가했는데 고프로 영상 퀄리티가 대박입니다. 꼭 추천해요.",
    images: [], status: "approved", createdAt: "2026-04-29T10:00:00Z",
  },
  {
    id: "r3", name: "박지연", avatar: "박", date: "2026-04-30", rating: 5, product: "VIP",
    text: "남자친구 생일 선물로 VIP 예약했는데 완전 대성공이었어요. 파노라마 코스 뷰가 진짜 말문이 막혔고 VIP 라운지에서 쉬는 것도 좋았어요.",
    images: [], status: "approved", createdAt: "2026-04-30T10:00:00Z",
  },
  {
    id: "r4", name: "정성민", avatar: "정", date: "2026-05-01", rating: 4, product: "베이직",
    text: "날씨 걱정했는데 당일 비행 가능 문자 받고 너무 좋았어요. 안전 교육을 꼼꼼하게 해주셔서 믿음이 갔고 비행 자체도 너무 즐거웠습니다.",
    images: [], status: "approved", createdAt: "2026-05-01T09:00:00Z",
  },
  {
    id: "r5", name: "한미영", avatar: "한", date: "2026-05-01", rating: 5, product: "익스트림",
    text: "버킷리스트 달성! 두 손 놓고 비행하는 순간이 평생 기억에 남을 것 같아요. 재예약 의사 200%입니다. 다음엔 VIP 도전할게요!",
    images: [], status: "approved", createdAt: "2026-05-01T11:00:00Z",
  },
  {
    id: "r6", name: "김도현", avatar: "김", date: "2026-04-27", rating: 5, product: "VIP",
    text: "회사 워크숍으로 단체 예약했어요. 직원들 반응이 최고였고 안전 관리도 철저해서 걱정 없이 즐길 수 있었습니다. 구름상회 강력 추천합니다!",
    images: [], status: "approved", createdAt: "2026-04-27T15:00:00Z",
  },
];

function load(): Review[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : SEED;
  } catch {
    return SEED;
  }
}

function save(reviews: Review[]) {
  localStorage.setItem(STORE_KEY, JSON.stringify(reviews));
  window.dispatchEvent(new Event(EVENT_KEY));
}

// ── CRUD ─────────────────────────────────────────────────────────

export function addReview(r: Omit<Review, "id" | "avatar" | "createdAt" | "status">) {
  const reviews = load();
  const newReview: Review = {
    ...r,
    id: `r${Date.now()}`,
    avatar: r.name.charAt(0),
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  save([newReview, ...reviews]);
}

export function setReviewStatus(id: string, status: ReviewStatus) {
  save(load().map((r) => r.id === id ? { ...r, status } : r));
}

export function deleteReview(id: string) {
  save(load().filter((r) => r.id !== id));
}

export function getApprovedReviews(): Review[] {
  return load().filter((r) => r.status === "approved");
}

// ── Hooks ────────────────────────────────────────────────────────

export function useReviews(status?: ReviewStatus): Review[] {
  const [reviews, setReviews] = useState<Review[]>([]);
  useEffect(() => {
    const refresh = () => {
      const all = load();
      setReviews(status ? all.filter((r) => r.status === status) : all);
    };
    refresh();
    window.addEventListener(EVENT_KEY, refresh);
    return () => window.removeEventListener(EVENT_KEY, refresh);
  }, [status]);
  return reviews;
}

export function useAllReviews(): Review[] {
  return useReviews(undefined);
}
