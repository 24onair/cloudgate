"use client";

import { useEffect, useState } from "react";

export interface ProductItem {
  id: string;
  name: string;
  subtitle: string;
  price: number;
  duration: string;
  features: string[];   // 배열 그대로 저장
  optionLabel: string;  // "" = 옵션 없음
  badge: string;        // "" = 배지 없음
  featured: boolean;
}

export interface SafetyItem {
  id: string;
  icon: string;
  title: string;
  desc: string;
}

export interface PageContent {
  // ── 히어로
  heroBadge: string;
  heroHeadline1: string;
  heroHeadline2: string;  // 오렌지 강조 줄
  heroSubtext: string;
  heroCtaButton: string;
  heroSecondaryButton: string;
  heroStat1Value: string; heroStat1Label: string;
  heroStat2Value: string; heroStat2Label: string;
  heroStat3Value: string; heroStat3Label: string;
  // ── 상품
  productLabel: string;
  productHeading: string;
  productSubtext: string;
  products: ProductItem[];
  // ── 안전수칙
  safetyLabel: string;
  safetyHeading: string;
  safetySubtext: string;
  safetyBannerTitle: string;
  safetyBannerDesc: string;
  safetyItems: SafetyItem[];
  // ── FAQ 섹션 헤더 (개별 FAQ는 faqStore에서 관리)
  faqLabel: string;
  faqHeading: string;
  faqNote: string;
  // ── CTA
  ctaLabel: string;
  ctaHeading: string;
  ctaSubtext: string;
  ctaButton: string;
  // ── 예약완료 페이지
  bookingCompleteTitle: string;  // "다음 단계"
  bookingCompleteSteps: string;  // 줄바꿈 구분 · {phone} 플레이스홀더 사용 가능
}

const EVENT_KEY = "gureum_page_content_update";

export const DEFAULT_CONTENT: PageContent = {
  heroBadge: "오늘 날씨 🟢 비행 최적",
  heroHeadline1: "하늘을 직접",
  heroHeadline2: "날아보세요",
  heroSubtext: "전문 파일럿과 함께하는 안전한 체험 패러글라이딩.\n초보자도 10분이면 하늘을 날 수 있습니다.",
  heroCtaButton: "지금 예약하기",
  heroSecondaryButton: "상품 보기",
  heroStat1Value: "2,400+", heroStat1Label: "누적 비행",
  heroStat2Value: "4.9",    heroStat2Label: "평균 별점",
  heroStat3Value: "100%",   heroStat3Label: "안전 운항",

  productLabel: "EXPERIENCE",
  productHeading: "내게 맞는 비행을 선택하세요",
  productSubtext: "모든 상품은 전문 파일럿 동반 탠덤 비행입니다",
  products: [
    {
      id: "basic",
      name: "베이직",
      subtitle: "첫 패러글라이딩 입문",
      price: 75000,
      duration: "약 10분",
      features: ["조종사 동반 탠덤 비행", "기본 비행 체험", "지상 안전 교육 20분", "기념 스티커 증정"],
      optionLabel: "사진 패키지 +30,000원",
      badge: "",
      featured: false,
    },
    {
      id: "extreme",
      name: "익스트림",
      subtitle: "스릴 넘치는 고고도 비행",
      price: 120000,
      duration: "약 20분",
      features: ["고고도 탠덤 비행", "와인더 스릴 기동 체험", "지상 안전 교육 20분", "기념 스티커 증정"],
      optionLabel: "사진·영상 패키지 +40,000원",
      badge: "인기",
      featured: true,
    },
    {
      id: "vip",
      name: "VIP",
      subtitle: "프리미엄 풀 패키지",
      price: 180000,
      duration: "약 30분",
      features: ["최고고도 파노라마 코스", "프리미엄 파일럿 배정", "지상 안전 교육 20분", "사진+영상 풀 패키지 포함", "VIP 라운지 이용"],
      optionLabel: "",
      badge: "프리미엄",
      featured: false,
    },
  ],

  safetyLabel: "SAFETY FIRST",
  safetyHeading: "안전이 최우선입니다",
  safetySubtext: "체험 전 아래 안전 수칙을 반드시 확인해 주세요",
  safetyBannerTitle: "전 파일럿 자격증 보유 · 비행안전 보험 가입",
  safetyBannerDesc: "구름상회의 모든 파일럿은 한국활공협회 공인 자격증 소지자이며, 탑승 전 장비 이상 유무를 반드시 점검합니다.",
  safetyItems: [
    { id: "s1", icon: "⚖️", title: "체중 제한", desc: "40kg 이상 ~ 90kg 이하 탑승 가능" },
    { id: "s2", icon: "❤️", title: "건강 상태", desc: "심장질환·고혈압·간질 병력 탑승 불가" },
    { id: "s3", icon: "🤰", title: "임산부 제한", desc: "임신 중 체험 탑승 불가" },
    { id: "s4", icon: "🍺", title: "음주 금지", desc: "음주 상태에서 탑승 엄격히 금지" },
    { id: "s5", icon: "👟", title: "복장 규정", desc: "운동화 필수 · 샌들·슬리퍼 불가" },
    { id: "s6", icon: "📱", title: "소지품 주의", desc: "낙하 위험 소지품은 지상 보관" },
  ],

  faqLabel: "FAQ",
  faqHeading: "자주 묻는 질문",
  faqNote: "더 궁금한 점은 카카오톡 채널로 문의해 주세요",

  ctaLabel: "READY TO FLY?",
  ctaHeading: "오늘, 하늘을 날아보세요",
  ctaSubtext: "주말 슬롯이 빠르게 마감됩니다",
  ctaButton: "지금 예약하기",

  bookingCompleteTitle: "다음 단계",
  bookingCompleteSteps: "예약금 결제 링크가 {phone}으로 발송됩니다\n비행 당일 오전 7시에 날씨 확인 문자를 드립니다\n현장 도착 20분 전 체크인 부탁드립니다",
};

// ── in-memory cache ────────────────────────────────────────────────
let _cache: PageContent | null = null;

// ── API helpers ────────────────────────────────────────────────────

async function loadFromApi(): Promise<PageContent> {
  try {
    const res = await fetch("/api/site-settings/page_content");
    if (!res.ok) return DEFAULT_CONTENT;
    const data = await res.json();
    const value = data?.value;
    if (!value) return DEFAULT_CONTENT;
    const parsed: PageContent = {
      ...DEFAULT_CONTENT,
      ...value,
      products:    value.products    ?? DEFAULT_CONTENT.products,
      safetyItems: value.safetyItems ?? DEFAULT_CONTENT.safetyItems,
    };
    _cache = parsed;
    return parsed;
  } catch {
    return DEFAULT_CONTENT;
  }
}

async function saveToApi(c: PageContent): Promise<void> {
  _cache = c;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT_KEY));
  try {
    await fetch("/api/site-settings/page_content", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: c }),
    });
  } catch {
    /* 실패해도 캐시는 유지 */
  }
}

// ── API ───────────────────────────────────────────────────────────

export function getPageContent(): PageContent {
  return _cache ?? DEFAULT_CONTENT;
}

export function setPageContent(patch: Partial<PageContent>): void {
  const current = _cache ?? DEFAULT_CONTENT;
  saveToApi({ ...current, ...patch });
}

// ── hook ──────────────────────────────────────────────────────────

export function usePageContent(): PageContent {
  const [content, setContent] = useState<PageContent>(_cache ?? DEFAULT_CONTENT);

  useEffect(() => {
    let mounted = true;

    if (!_cache) {
      loadFromApi().then((d) => {
        if (mounted) setContent(d);
      });
    }

    const refresh = () => {
      if (_cache) setContent({ ..._cache });
    };
    window.addEventListener(EVENT_KEY, refresh);
    return () => {
      mounted = false;
      window.removeEventListener(EVENT_KEY, refresh);
    };
  }, []);

  return content;
}
