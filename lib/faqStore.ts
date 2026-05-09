"use client";

import { useEffect, useState } from "react";

export interface FaqEntry {
  id: string;
  q: string;
  a: string;
}

const STORE_KEY   = "gureum_faqs";
const EVENT_KEY   = "gureum_faqs_update";

// ── 기본 FAQ 데이터 ────────────────────────────────────────────────
const DEFAULT_FAQS: FaqEntry[] = [
  { id: "faq-1", q: "예약 취소 및 환불은 어떻게 되나요?", a: "체험 3일 전까지 전액 환불, 2일 전 50% 환불, 1일 전 및 당일 취소는 환불 불가입니다. 단, 기상 악화로 인한 운항 취소 시 전액 환불 또는 날짜 변경이 가능합니다." },
  { id: "faq-2", q: "전체 소요 시간은 얼마나 되나요?", a: "현장 도착 후 안전 교육(20분) → 장비 착용(10분) → 비행 체험 → 기념사진 순으로 진행됩니다. 상품에 따라 총 50분~1시간 30분 소요됩니다." },
  { id: "faq-3", q: "날씨가 나쁘면 어떻게 되나요?", a: "기상 상태(풍속·시정·강수)에 따라 비행 가능 여부를 당일 오전 7시까지 문자로 안내드립니다. 비행 불가 시 전액 환불 또는 날짜 변경 중 선택하실 수 있습니다." },
  { id: "faq-4", q: "사진·영상 촬영은 어떻게 하나요?", a: "고프로 기반 촬영 옵션을 예약 시 추가할 수 있습니다. 촬영본은 당일 USB 또는 구글 드라이브 링크로 전달됩니다. 개인 카메라·스마트폰은 안전상 비행 중 사용 불가합니다." },
  { id: "faq-5", q: "혼자 가도 괜찮나요?", a: "네, 1인 예약도 가능합니다. 모든 비행은 전문 파일럿과 함께하는 탠덤(2인 1조) 방식이라 혼자 오셔도 안전하게 즐기실 수 있습니다." },
  { id: "faq-6", q: "아이도 탑승할 수 있나요?", a: "만 12세 이상, 체중 40kg 이상이면 보호자 동의 하에 탑승 가능합니다. 미성년자는 법정대리인 동의서를 현장에서 작성해 주셔야 합니다." },
  { id: "faq-7", q: "예약금은 얼마인가요?", a: "예약 시 상품 금액의 30%를 예약금으로 결제하며, 나머지는 현장에서 결제하시면 됩니다. 카드·현금·계좌이체 모두 가능합니다." },
];

// ── helpers ───────────────────────────────────────────────────────
function load(): FaqEntry[] {
  if (typeof window === "undefined") return DEFAULT_FAQS;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as FaqEntry[]) : DEFAULT_FAQS;
  } catch {
    return DEFAULT_FAQS;
  }
}

function save(faqs: FaqEntry[]) {
  localStorage.setItem(STORE_KEY, JSON.stringify(faqs));
  window.dispatchEvent(new Event(EVENT_KEY));
}

// ── API ───────────────────────────────────────────────────────────
export function addFaq(entry: Omit<FaqEntry, "id">): void {
  const faqs = load();
  faqs.push({ ...entry, id: `faq-${Date.now()}` });
  save(faqs);
}

export function deleteFaq(id: string): void {
  save(load().filter((f) => f.id !== id));
}

export function updateFaq(id: string, patch: Partial<Omit<FaqEntry, "id">>): void {
  save(load().map((f) => (f.id === id ? { ...f, ...patch } : f)));
}

export function moveFaq(id: string, dir: "up" | "down"): void {
  const faqs = load();
  const idx  = faqs.findIndex((f) => f.id === id);
  if (idx < 0) return;
  const next = dir === "up" ? idx - 1 : idx + 1;
  if (next < 0 || next >= faqs.length) return;
  [faqs[idx], faqs[next]] = [faqs[next], faqs[idx]];
  save(faqs);
}

// ── hook ──────────────────────────────────────────────────────────
export function useFaqs(): FaqEntry[] {
  const [faqs, setFaqs] = useState<FaqEntry[]>([]);
  useEffect(() => {
    const refresh = () => setFaqs(load());
    refresh();
    window.addEventListener(EVENT_KEY, refresh);
    return () => window.removeEventListener(EVENT_KEY, refresh);
  }, []);
  return faqs;
}
