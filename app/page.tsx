"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Wind,
  Star,
  Shield,
  Clock,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Camera,
  CheckCircle2,
  Phone,
  MessageCircle,
  MapPin,
  Plane,
  Users,
  Play,
  ExternalLink,
} from "lucide-react";
import { useSns, youtubeThumbnail } from "@/lib/snsStore";
import { InstagramIcon as Instagram, YoutubeIcon as Youtube } from "@/components/SnsIcons";
import { useHeroBg } from "@/lib/heroStore";

// ── 데이터 ────────────────────────────────────────────────────────
const PRODUCTS = [
  {
    id: "basic",
    name: "베이직",
    subtitle: "첫 패러글라이딩 입문",
    price: 75000,
    duration: "약 10분",
    highlight: false,
    color: "#2A7AE2",
    bg: "white",
    border: "#E5E7EB",
    features: [
      "조종사 동반 탠덤 비행",
      "기본 비행 체험",
      "지상 안전 교육 20분",
      "기념 스티커 증정",
    ],
    optionLabel: "사진 패키지 +30,000원",
    badge: null,
  },
  {
    id: "extreme",
    name: "익스트림",
    subtitle: "스릴 넘치는 고고도 비행",
    price: 120000,
    duration: "약 20분",
    highlight: true,
    color: "white",
    bg: "#0D2B52",
    border: "#0D2B52",
    features: [
      "고고도 탠덤 비행",
      "와인더 스릴 기동 체험",
      "지상 안전 교육 20분",
      "기념 스티커 증정",
    ],
    optionLabel: "사진·영상 패키지 +40,000원",
    badge: "인기",
  },
  {
    id: "vip",
    name: "VIP",
    subtitle: "프리미엄 풀 패키지",
    price: 180000,
    duration: "약 30분",
    highlight: false,
    color: "#FF8A00",
    bg: "white",
    border: "#FED7AA",
    features: [
      "최고고도 파노라마 코스",
      "프리미엄 파일럿 배정",
      "지상 안전 교육 20분",
      "사진+영상 풀 패키지 포함",
      "VIP 라운지 이용",
    ],
    optionLabel: null,
    badge: "프리미엄",
  },
];

const SAFETY = [
  { icon: "⚖️", title: "체중 제한", desc: "40kg 이상 ~ 90kg 이하 탑승 가능" },
  { icon: "❤️", title: "건강 상태", desc: "심장질환·고혈압·간질 병력 탑승 불가" },
  { icon: "🤰", title: "임산부 제한", desc: "임신 중 체험 탑승 불가" },
  { icon: "🍺", title: "음주 금지", desc: "음주 상태에서 탑승 엄격히 금지" },
  { icon: "👟", title: "복장 규정", desc: "운동화 필수 · 샌들·슬리퍼 불가" },
  { icon: "📱", title: "소지품 주의", desc: "낙하 위험 소지품은 지상 보관" },
];

const FAQS = [
  {
    q: "예약 취소 및 환불은 어떻게 되나요?",
    a: "체험 3일 전까지 전액 환불, 2일 전 50% 환불, 1일 전 및 당일 취소는 환불 불가입니다. 단, 기상 악화로 인한 운항 취소 시 전액 환불 또는 날짜 변경이 가능합니다.",
  },
  {
    q: "전체 소요 시간은 얼마나 되나요?",
    a: "현장 도착 후 안전 교육(20분) → 장비 착용(10분) → 비행 체험 → 기념사진 순으로 진행됩니다. 상품에 따라 총 50분~1시간 30분 소요됩니다.",
  },
  {
    q: "날씨가 나쁘면 어떻게 되나요?",
    a: "기상 상태(풍속·시정·강수)에 따라 비행 가능 여부를 당일 오전 7시까지 문자로 안내드립니다. 비행 불가 시 전액 환불 또는 날짜 변경 중 선택하실 수 있습니다.",
  },
  {
    q: "사진·영상 촬영은 어떻게 하나요?",
    a: "고프로 기반 촬영 옵션을 예약 시 추가할 수 있습니다. 촬영본은 당일 USB 또는 구글 드라이브 링크로 전달됩니다. 개인 카메라·스마트폰은 안전상 비행 중 사용 불가합니다.",
  },
  {
    q: "혼자 가도 괜찮나요?",
    a: "네, 1인 예약도 가능합니다. 모든 비행은 전문 파일럿과 함께하는 탠덤(2인 1조) 방식이라 혼자 오셔도 안전하게 즐기실 수 있습니다.",
  },
  {
    q: "아이도 탑승할 수 있나요?",
    a: "만 12세 이상, 체중 40kg 이상이면 보호자 동의 하에 탑승 가능합니다. 미성년자는 법정대리인 동의서를 현장에서 작성해 주셔야 합니다.",
  },
  {
    q: "예약금은 얼마인가요?",
    a: "예약 시 상품 금액의 30%를 예약금으로 결제하며, 나머지는 현장에서 결제하시면 됩니다. 카드·현금·계좌이체 모두 가능합니다.",
  },
];

const REVIEWS = [
  {
    name: "이수진",
    date: "2026-04-28",
    rating: 5,
    product: "베이직",
    avatar: "이",
    avatarColor: "#2A7AE2",
    text: "생애 처음 패러글라이딩인데 파일럿분이 너무 친절하게 설명해 주셔서 무서움 없이 즐길 수 있었어요. 하늘에서 보이는 뷰가 정말 잊지 못할 것 같아요!",
  },
  {
    name: "최현우",
    date: "2026-04-29",
    rating: 5,
    product: "익스트림",
    avatar: "최",
    avatarColor: "#FF8A00",
    text: "스릴 넘치는 비행이었습니다! 고고도 기동할 때 심장이 쫄깃했어요. 사진 패키지도 추가했는데 고프로 영상 퀄리티가 대박입니다. 꼭 추천해요.",
  },
  {
    name: "박지연",
    date: "2026-04-30",
    rating: 5,
    product: "VIP",
    avatar: "박",
    avatarColor: "#8B5CF6",
    text: "남자친구 생일 선물로 VIP 예약했는데 완전 대성공이었어요. 파노라마 코스 뷰가 진짜 말문이 막혔고 VIP 라운지에서 쉬는 것도 좋았어요.",
  },
  {
    name: "정성민",
    date: "2026-05-01",
    rating: 4,
    product: "베이직",
    avatar: "정",
    avatarColor: "#10B981",
    text: "날씨 걱정했는데 당일 비행 가능 문자 받고 너무 좋았어요. 안전 교육을 꼼꼼하게 해주셔서 믿음이 갔고 비행 자체도 너무 즐거웠습니다.",
  },
  {
    name: "한미영",
    date: "2026-05-01",
    rating: 5,
    product: "익스트림",
    avatar: "한",
    avatarColor: "#EF4444",
    text: "버킷리스트 달성! 두 손 놓고 비행하는 순간이 평생 기억에 남을 것 같아요. 재예약 의사 200%입니다. 다음엔 VIP 도전할게요!",
  },
  {
    name: "김도현",
    date: "2026-04-27",
    rating: 5,
    product: "VIP",
    avatar: "김",
    avatarColor: "#0D2B52",
    text: "회사 워크숍으로 단체 예약했어요. 직원들 반응이 최고였고 안전 관리도 철저해서 걱정 없이 즐길 수 있었습니다. 구름상회 강력 추천합니다!",
  },
];

// ── 컴포넌트 ─────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className="w-3.5 h-3.5"
          fill={i < rating ? "#FBBF24" : "none"}
          stroke={i < rating ? "#FBBF24" : "#D1D5DB"}
        />
      ))}
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="border-b border-gray-100 last:border-0 cursor-pointer"
      onClick={() => setOpen(!open)}
    >
      <div className="flex items-center justify-between py-4 gap-4">
        <p className="font-medium text-gray-800 text-sm leading-relaxed flex-1">{q}</p>
        {open ? (
          <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}
      </div>
      {open && (
        <p className="text-sm text-gray-500 leading-relaxed pb-4 pr-8">{a}</p>
      )}
    </div>
  );
}

// ── 메인 ─────────────────────────────────────────────────────────
export default function LandingPage() {
  const router = useRouter();
  const [navScrolled, setNavScrolled] = useState(false);
  const productRef = useRef<HTMLDivElement>(null);
  const { profile: snsProfile, posts: instaPosts, shorts: ytShortsManual, fetchedShorts } = useSns();
  const heroBg = useHeroBg();
  // 자동 가져오기가 켜져있고 결과가 있으면 자동 결과 사용, 없으면 수동 등록 사용
  const ytShortsForLanding =
    snsProfile.youtubeAutoFetch && fetchedShorts.length > 0
      ? fetchedShorts.map((s) => ({ id: s.videoId, videoId: s.videoId, title: s.title, sortOrder: 0 }))
      : ytShortsManual;

  useEffect(() => {
    const handler = () => setNavScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const scrollToProducts = () =>
    productRef.current?.scrollIntoView({ behavior: "smooth" });

  const avgRating = (
    REVIEWS.reduce((s, r) => s + r.rating, 0) / REVIEWS.length
  ).toFixed(1);

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "var(--font-geist-sans)" }}>
      {/* ── 내비 ─────────────────────────────────────────────────── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          backgroundColor: navScrolled ? "rgba(13,43,82,0.97)" : "transparent",
          backdropFilter: navScrolled ? "blur(12px)" : "none",
          borderBottom: navScrolled ? "1px solid rgba(255,255,255,0.08)" : "none",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wind className="w-5 h-5" style={{ color: "#FF8A00" }} />
            <span className="text-white font-bold text-lg tracking-tight">구름상회</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-white/70">
            <button onClick={scrollToProducts} className="hover:text-white transition-colors">상품 안내</button>
            <a href="#safety" className="hover:text-white transition-colors">안전 수칙</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
            <a href="#reviews" className="hover:text-white transition-colors">후기</a>
          </div>
          <button
            onClick={() => router.push("/booking")}
            className="px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-90"
            style={{ backgroundColor: "#FF8A00", color: "white" }}
          >
            예약하기
          </button>
        </div>
      </nav>

      {/* ── 히어로 ───────────────────────────────────────────────── */}
      <section
        className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 overflow-hidden"
        style={{
          background: heroBg.imageDataUrl && heroBg.enabled
            ? undefined
            : "linear-gradient(175deg, #020d1f 0%, #0D2B52 35%, #1a4a80 60%, #2A7AE2 85%, #5ba3e8 100%)",
          backgroundColor: heroBg.imageDataUrl && heroBg.enabled ? "#020d1f" : undefined,
        }}
      >
        {/* 배경 이미지 (설정된 경우) */}
        {heroBg.imageDataUrl && heroBg.enabled && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroBg.imageDataUrl}
              alt=""
              aria-hidden
              className="absolute inset-0 w-full h-full object-cover"
              style={{ objectPosition: "center" }}
            />
            {/* 브랜드 그라데이션 오버레이 — 가독성 확보 */}
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(175deg,
                  rgba(2,13,31,${(heroBg.overlayOpacity / 100).toFixed(2)}) 0%,
                  rgba(13,43,82,${Math.min(1, heroBg.overlayOpacity / 100 + 0.05).toFixed(2)}) 35%,
                  rgba(26,74,128,${Math.max(0, heroBg.overlayOpacity / 100 - 0.05).toFixed(2)}) 65%,
                  rgba(42,122,226,${Math.max(0, heroBg.overlayOpacity / 100 - 0.15).toFixed(2)}) 100%)`,
              }}
            />
          </>
        )}

        {/* 구름 장식 */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 60% 30% at 20% 70%, white 0%, transparent 70%), radial-gradient(ellipse 40% 20% at 80% 60%, white 0%, transparent 70%)",
          }}
        />

        {/* 본문 — 이미지·오버레이 위로 */}
        <div className="relative z-10 flex flex-col items-center">

        {/* 뱃지 */}
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-8"
          style={{ backgroundColor: "rgba(255,138,0,0.15)", border: "1px solid rgba(255,138,0,0.3)", color: "#FF8A00" }}
        >
          <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
          오늘 날씨 🟢 비행 최적
        </div>

        <h1 className="text-5xl md:text-7xl font-black text-white leading-none tracking-tight mb-6">
          하늘을<br />
          <span style={{ color: "#FF8A00" }}>직접</span> 날아보세요
        </h1>
        <p className="text-white/60 text-lg md:text-xl max-w-xl leading-relaxed mb-10">
          전문 파일럿과 함께하는 안전한 체험 패러글라이딩.<br />
          초보자도 10분이면 하늘을 날 수 있습니다.
        </p>

        {/* 통계 */}
        <div className="flex items-center gap-6 mb-10">
          {[
            { value: "2,400+", label: "누적 비행" },
            { value: "4.9", label: "평균 별점" },
            { value: "100%", label: "안전 운항" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-black text-white">{s.value}</p>
              <p className="text-xs text-white/50 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => router.push("/booking")}
            className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-base font-bold transition-all hover:opacity-90 hover:scale-105"
            style={{ backgroundColor: "#FF8A00", color: "white" }}
          >
            지금 예약하기
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={scrollToProducts}
            className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-base font-medium transition-all"
            style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "white", border: "1px solid rgba(255,255,255,0.2)" }}
          >
            상품 보기
          </button>
        </div>

        </div>{/* /relative z-10 */}

        {/* 스크롤 인디케이터 */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/30 animate-bounce z-10">
          <ChevronDown className="w-5 h-5" />
        </div>
      </section>

      {/* ── 상품 ─────────────────────────────────────────────────── */}
      <section ref={productRef} className="py-20 px-6" style={{ backgroundColor: "#F5F7FA" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold tracking-widest mb-3" style={{ color: "#FF8A00" }}>EXPERIENCE</p>
            <h2 className="text-3xl md:text-4xl font-black" style={{ color: "#0D2B52" }}>
              내게 맞는 비행을 선택하세요
            </h2>
            <p className="text-gray-500 mt-3 text-base">모든 상품은 전문 파일럿 동반 탠덤 비행입니다</p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {PRODUCTS.map((p) => (
              <div
                key={p.id}
                className="rounded-3xl p-7 flex flex-col relative overflow-hidden transition-transform hover:-translate-y-1"
                style={{
                  backgroundColor: p.bg,
                  border: `2px solid ${p.border}`,
                  boxShadow: p.highlight ? "0 20px 60px rgba(13,43,82,0.25)" : "0 4px 20px rgba(0,0,0,0.06)",
                }}
              >
                {/* 뱃지 */}
                {p.badge && (
                  <span
                    className="absolute top-5 right-5 text-xs font-bold px-2.5 py-1 rounded-full"
                    style={{
                      backgroundColor: p.highlight ? "#FF8A00" : "#FF8A0020",
                      color: p.highlight ? "white" : "#FF8A00",
                    }}
                  >
                    {p.badge}
                  </span>
                )}

                {/* 상품명 */}
                <div className="mb-6">
                  <p
                    className="text-xs font-semibold tracking-widest mb-1"
                    style={{ color: p.highlight ? "rgba(255,255,255,0.5)" : "#9CA3AF" }}
                  >
                    {p.subtitle.toUpperCase()}
                  </p>
                  <h3
                    className="text-2xl font-black"
                    style={{ color: p.highlight ? "white" : "#0D2B52" }}
                  >
                    {p.name}
                  </h3>
                </div>

                {/* 가격 */}
                <div className="mb-6">
                  <span
                    className="text-3xl font-black"
                    style={{ color: p.highlight ? "#FF8A00" : p.color }}
                  >
                    {p.price.toLocaleString()}
                  </span>
                  <span
                    className="text-sm ml-1"
                    style={{ color: p.highlight ? "rgba(255,255,255,0.5)" : "#9CA3AF" }}
                  >
                    원 / 1인
                  </span>
                </div>

                {/* 스펙 */}
                <div className="flex gap-4 mb-6">
                  <div
                    className="flex items-center gap-1.5 text-sm"
                    style={{ color: p.highlight ? "rgba(255,255,255,0.7)" : "#6B7280" }}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    {p.duration}
                  </div>
                </div>

                {/* 포함 사항 */}
                <div className="space-y-2 flex-1 mb-6">
                  {p.features.map((f) => (
                    <div key={f} className="flex items-start gap-2">
                      <CheckCircle2
                        className="w-4 h-4 mt-0.5 flex-shrink-0"
                        style={{ color: p.highlight ? "#FF8A00" : p.color }}
                      />
                      <span
                        className="text-sm"
                        style={{ color: p.highlight ? "rgba(255,255,255,0.8)" : "#4B5563" }}
                      >
                        {f}
                      </span>
                    </div>
                  ))}
                </div>

                {/* 옵션 */}
                {p.optionLabel && (
                  <p
                    className="text-xs mb-4 px-3 py-2 rounded-xl"
                    style={{
                      color: p.highlight ? "rgba(255,255,255,0.6)" : "#9CA3AF",
                      backgroundColor: p.highlight ? "rgba(255,255,255,0.06)" : "#F9FAFB",
                    }}
                  >
                    + 옵션: {p.optionLabel}
                  </p>
                )}

                <button
                  onClick={() => router.push(`/booking?product=${p.id}`)}
                  className="w-full py-3.5 rounded-2xl text-sm font-bold transition-all hover:opacity-90"
                  style={{
                    backgroundColor: p.highlight ? "#FF8A00" : p.color,
                    color: "white",
                  }}
                >
                  이 상품으로 예약
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 인스타그램 피드 ─────────────────────────────────────── */}
      {instaPosts.length > 0 && snsProfile.instagramCount > 0 && (
        <section className="py-20 px-6 bg-white">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <p
                className="text-sm font-semibold tracking-widest mb-3 flex items-center justify-center gap-2"
                style={{ color: "#E1306C" }}
              >
                <Instagram className="w-4 h-4" />
                INSTAGRAM
              </p>
              <h2 className="text-3xl md:text-4xl font-black" style={{ color: "#0D2B52" }}>
                생생한 비행 순간들
              </h2>
              <a
                href={snsProfile.instagramUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm mt-3 font-medium hover:underline"
                style={{ color: "#E1306C" }}
              >
                {snsProfile.instagramHandle}
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {instaPosts.slice(0, snsProfile.instagramCount).map((post) => {
                const content = (
                  <div className="relative rounded-2xl overflow-hidden aspect-square group cursor-pointer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.imageUrl}
                      alt={post.caption}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg, rgba(225,48,108,0.85), rgba(245,133,41,0.85))" }}
                    >
                      <Instagram className="w-8 h-8 text-white" />
                    </div>
                    {post.caption && (
                      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
                        <p className="text-white text-xs font-medium line-clamp-2">{post.caption}</p>
                      </div>
                    )}
                  </div>
                );
                return post.link ? (
                  <a key={post.id} href={post.link} target="_blank" rel="noreferrer">
                    {content}
                  </a>
                ) : (
                  <div key={post.id}>{content}</div>
                );
              })}
            </div>

            <div className="text-center mt-8">
              <a
                href={snsProfile.instagramUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
                style={{ background: "linear-gradient(135deg, #E1306C, #F58529)" }}
              >
                <Instagram className="w-4 h-4" />
                인스타그램에서 더 보기
              </a>
            </div>
          </div>
        </section>
      )}

      {/* ── 유튜브 쇼츠 ─────────────────────────────────────────── */}
      {ytShortsForLanding.length > 0 && snsProfile.youtubeCount > 0 && (
        <section className="py-20 px-6" style={{ backgroundColor: "#0D2B52" }}>
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <p
                className="text-sm font-semibold tracking-widest mb-3 flex items-center justify-center gap-2"
                style={{ color: "#FF0000" }}
              >
                <Youtube className="w-4 h-4" />
                YOUTUBE SHORTS
              </p>
              <h2 className="text-3xl md:text-4xl font-black text-white">
                영상으로 만나는 구름상회
              </h2>
              <a
                href={snsProfile.youtubeChannelUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm mt-3 font-medium hover:underline text-white/70"
              >
                {snsProfile.youtubeChannelName}
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
              {ytShortsForLanding.slice(0, snsProfile.youtubeCount).map((s) => (
                <a
                  key={s.id}
                  href={`https://youtube.com/shorts/${s.videoId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="relative rounded-2xl overflow-hidden group cursor-pointer"
                  style={{ aspectRatio: "9/16" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={youtubeThumbnail(s.videoId)}
                    alt={s.title}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                      style={{ backgroundColor: "rgba(255,0,0,0.9)" }}
                    >
                      <Play className="w-6 h-6 text-white fill-white ml-1" />
                    </div>
                  </div>
                  {s.title && (
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white text-xs font-medium line-clamp-2">{s.title}</p>
                    </div>
                  )}
                </a>
              ))}
            </div>

            <div className="text-center mt-8">
              <a
                href={snsProfile.youtubeChannelUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
                style={{ backgroundColor: "#FF0000" }}
              >
                <Youtube className="w-4 h-4" />
                채널 구독하기
              </a>
            </div>
          </div>
        </section>
      )}

      {/* ── 안전 수칙 ─────────────────────────────────────────────── */}
      <section id="safety" className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold tracking-widest mb-3" style={{ color: "#2A7AE2" }}>SAFETY FIRST</p>
            <h2 className="text-3xl md:text-4xl font-black" style={{ color: "#0D2B52" }}>
              안전이 최우선입니다
            </h2>
            <p className="text-gray-500 mt-3 text-base">
              체험 전 아래 안전 수칙을 반드시 확인해 주세요
            </p>
          </div>

          {/* 안전 배너 */}
          <div
            className="rounded-3xl px-8 py-6 mb-10 flex items-center gap-4"
            style={{ backgroundColor: "#EFF6FF", border: "1.5px solid #BFDBFE" }}
          >
            <Shield className="w-8 h-8 flex-shrink-0" style={{ color: "#2A7AE2" }} />
            <div>
              <p className="font-bold text-blue-900">전 파일럿 자격증 보유 · 비행안전 보험 가입</p>
              <p className="text-sm text-blue-600 mt-0.5">
                구름상회의 모든 파일럿은 한국활공협회 공인 자격증 소지자이며, 탑승 전 장비 이상 유무를 반드시 점검합니다.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {SAFETY.map((s) => (
              <div
                key={s.title}
                className="flex gap-4 p-5 rounded-2xl"
                style={{ backgroundColor: "#F9FAFB", border: "1px solid #F3F4F6" }}
              >
                <span className="text-2xl flex-shrink-0">{s.icon}</span>
                <div>
                  <p className="font-bold text-sm" style={{ color: "#0D2B52" }}>{s.title}</p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────── */}
      <section id="faq" className="py-20 px-6" style={{ backgroundColor: "#F5F7FA" }}>
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold tracking-widest mb-3" style={{ color: "#FF8A00" }}>FAQ</p>
            <h2 className="text-3xl md:text-4xl font-black" style={{ color: "#0D2B52" }}>
              자주 묻는 질문
            </h2>
          </div>

          <div
            className="bg-white rounded-3xl px-8 py-2"
            style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}
          >
            {FAQS.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>

          <p className="text-center text-sm text-gray-400 mt-6">
            더 궁금한 점은{" "}
            <button className="font-semibold underline" style={{ color: "#2A7AE2" }}>
              카카오톡 채널
            </button>
            로 문의해 주세요
          </p>
        </div>
      </section>

      {/* ── 후기 ─────────────────────────────────────────────────── */}
      <section id="reviews" className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold tracking-widest mb-3" style={{ color: "#FF8A00" }}>REVIEWS</p>
            <h2 className="text-3xl md:text-4xl font-black" style={{ color: "#0D2B52" }}>
              실제 체험 후기
            </h2>
            <div className="flex items-center justify-center gap-2 mt-4">
              <StarRating rating={5} />
              <span className="text-2xl font-black" style={{ color: "#0D2B52" }}>{avgRating}</span>
              <span className="text-gray-400 text-sm">/ 5.0 · {REVIEWS.length}개 후기</span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {REVIEWS.map((r) => (
              <div
                key={r.name + r.date}
                className="rounded-3xl p-6 flex flex-col"
                style={{
                  backgroundColor: "#F9FAFB",
                  border: "1px solid #F3F4F6",
                }}
              >
                {/* 상단: 프로필 + 별점 */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                      style={{ backgroundColor: r.avatarColor }}
                    >
                      {r.avatar}
                    </div>
                    <div>
                      <p className="font-bold text-sm" style={{ color: "#0D2B52" }}>{r.name}</p>
                      <p className="text-xs text-gray-400">{r.date}</p>
                    </div>
                  </div>
                  <StarRating rating={r.rating} />
                </div>

                {/* 상품 배지 */}
                <span
                  className="inline-flex self-start text-xs px-2.5 py-1 rounded-full font-medium mb-3"
                  style={{
                    backgroundColor:
                      r.product === "VIP" ? "#F5F3FF" : r.product === "익스트림" ? "#FFF7ED" : "#EFF6FF",
                    color:
                      r.product === "VIP" ? "#8B5CF6" : r.product === "익스트림" ? "#FF8A00" : "#2A7AE2",
                  }}
                >
                  {r.product}
                </span>

                {/* 후기 */}
                <p className="text-sm text-gray-600 leading-relaxed flex-1">{r.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA 배너 ─────────────────────────────────────────────── */}
      <section
        className="py-20 px-6 text-center"
        style={{
          background: "linear-gradient(135deg, #0D2B52 0%, #1a4a80 50%, #2A7AE2 100%)",
        }}
      >
        <p className="text-white/50 text-sm tracking-widest mb-4">READY TO FLY?</p>
        <h2 className="text-3xl md:text-5xl font-black text-white mb-4">
          오늘, 하늘을 날아보세요
        </h2>
        <p className="text-white/60 mb-10 text-base">
          주말 슬롯이 빠르게 마감됩니다
        </p>
        <button
          onClick={() => router.push("/booking")}
          className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl text-base font-bold transition-all hover:opacity-90 hover:scale-105"
          style={{ backgroundColor: "#FF8A00", color: "white" }}
        >
          지금 예약하기
          <ArrowRight className="w-5 h-5" />
        </button>
      </section>

      {/* ── 푸터 ─────────────────────────────────────────────────── */}
      <footer
        className="py-12 px-6"
        style={{ backgroundColor: "#020d1f", color: "rgba(255,255,255,0.3)" }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-start justify-between gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Wind className="w-5 h-5" style={{ color: "#FF8A00" }} />
                <span className="text-white font-bold text-lg">구름상회</span>
              </div>
              <p className="text-sm leading-relaxed max-w-xs">
                하늘을 가장 가까이서 만나는 곳.<br />
                패러글라이딩 체험비행 전문 업체.
              </p>
            </div>
            <div className="flex gap-12 text-sm">
              <div className="space-y-2">
                <p className="text-white/60 font-medium mb-3">운영 시간</p>
                <p>평일 09:00 ~ 18:00</p>
                <p>주말 07:00 ~ 19:00</p>
                <p>기상 악화 시 당일 공지</p>
              </div>
              <div className="space-y-2">
                <p className="text-white/60 font-medium mb-3">문의</p>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5" />
                  <span>010-0000-0000</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>카카오톡 채널</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>강원도 ○○군 ○○면</span>
                </div>
              </div>
            </div>
          </div>
          <div
            className="pt-6 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-2 text-xs"
          >
            <p>© 2026 구름상회. All rights reserved.</p>
            <p>사업자등록번호 000-00-00000 · 대표 홍길동</p>
          </div>
        </div>
      </footer>

      {/* ── 플로팅 예약 버튼 (모바일) ─────────────────────────────── */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center z-40 md:hidden">
        <button
          onClick={() => router.push("/booking")}
          className="flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-bold shadow-2xl"
          style={{ backgroundColor: "#FF8A00", color: "white" }}
        >
          예약하기
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
