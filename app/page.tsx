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
  CheckCircle2,
  Phone,
  MessageCircle,
  MapPin,
  Play,
  ExternalLink,
  Menu,
  X,
} from "lucide-react";
import { useSns, youtubeThumbnail } from "@/lib/snsStore";
import { InstagramIcon as Instagram, YoutubeIcon as Youtube } from "@/components/SnsIcons";
import { useHeroBg, useCtaBg } from "@/lib/heroStore";

// ── 데이터 ────────────────────────────────────────────────────────
const PRODUCTS = [
  {
    id: "basic",
    name: "베이직",
    subtitle: "첫 패러글라이딩 입문",
    price: 75000,
    duration: "약 10분",
    features: ["조종사 동반 탠덤 비행", "기본 비행 체험", "지상 안전 교육 20분", "기념 스티커 증정"],
    optionLabel: "사진 패키지 +30,000원",
    badge: null,
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
    optionLabel: null,
    badge: "프리미엄",
    featured: false,
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
  { q: "예약 취소 및 환불은 어떻게 되나요?", a: "체험 3일 전까지 전액 환불, 2일 전 50% 환불, 1일 전 및 당일 취소는 환불 불가입니다. 단, 기상 악화로 인한 운항 취소 시 전액 환불 또는 날짜 변경이 가능합니다." },
  { q: "전체 소요 시간은 얼마나 되나요?", a: "현장 도착 후 안전 교육(20분) → 장비 착용(10분) → 비행 체험 → 기념사진 순으로 진행됩니다. 상품에 따라 총 50분~1시간 30분 소요됩니다." },
  { q: "날씨가 나쁘면 어떻게 되나요?", a: "기상 상태(풍속·시정·강수)에 따라 비행 가능 여부를 당일 오전 7시까지 문자로 안내드립니다. 비행 불가 시 전액 환불 또는 날짜 변경 중 선택하실 수 있습니다." },
  { q: "사진·영상 촬영은 어떻게 하나요?", a: "고프로 기반 촬영 옵션을 예약 시 추가할 수 있습니다. 촬영본은 당일 USB 또는 구글 드라이브 링크로 전달됩니다. 개인 카메라·스마트폰은 안전상 비행 중 사용 불가합니다." },
  { q: "혼자 가도 괜찮나요?", a: "네, 1인 예약도 가능합니다. 모든 비행은 전문 파일럿과 함께하는 탠덤(2인 1조) 방식이라 혼자 오셔도 안전하게 즐기실 수 있습니다." },
  { q: "아이도 탑승할 수 있나요?", a: "만 12세 이상, 체중 40kg 이상이면 보호자 동의 하에 탑승 가능합니다. 미성년자는 법정대리인 동의서를 현장에서 작성해 주셔야 합니다." },
  { q: "예약금은 얼마인가요?", a: "예약 시 상품 금액의 30%를 예약금으로 결제하며, 나머지는 현장에서 결제하시면 됩니다. 카드·현금·계좌이체 모두 가능합니다." },
];

const REVIEWS = [
  { name: "이수진", date: "2026-04-28", rating: 5, product: "베이직",   avatar: "이", text: "생애 처음 패러글라이딩인데 파일럿분이 너무 친절하게 설명해 주셔서 무서움 없이 즐길 수 있었어요. 하늘에서 보이는 뷰가 정말 잊지 못할 것 같아요!" },
  { name: "최현우", date: "2026-04-29", rating: 5, product: "익스트림", avatar: "최", text: "스릴 넘치는 비행이었습니다! 고고도 기동할 때 심장이 쫄깃했어요. 사진 패키지도 추가했는데 고프로 영상 퀄리티가 대박입니다. 꼭 추천해요." },
  { name: "박지연", date: "2026-04-30", rating: 5, product: "VIP",      avatar: "박", text: "남자친구 생일 선물로 VIP 예약했는데 완전 대성공이었어요. 파노라마 코스 뷰가 진짜 말문이 막혔고 VIP 라운지에서 쉬는 것도 좋았어요." },
  { name: "정성민", date: "2026-05-01", rating: 4, product: "베이직",   avatar: "정", text: "날씨 걱정했는데 당일 비행 가능 문자 받고 너무 좋았어요. 안전 교육을 꼼꼼하게 해주셔서 믿음이 갔고 비행 자체도 너무 즐거웠습니다." },
  { name: "한미영", date: "2026-05-01", rating: 5, product: "익스트림", avatar: "한", text: "버킷리스트 달성! 두 손 놓고 비행하는 순간이 평생 기억에 남을 것 같아요. 재예약 의사 200%입니다. 다음엔 VIP 도전할게요!" },
  { name: "김도현", date: "2026-04-27", rating: 5, product: "VIP",      avatar: "김", text: "회사 워크숍으로 단체 예약했어요. 직원들 반응이 최고였고 안전 관리도 철저해서 걱정 없이 즐길 수 있었습니다. 구름상회 강력 추천합니다!" },
];

// ── 컴포넌트 ──────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className="w-3.5 h-3.5" fill={i < rating ? "#F54E00" : "none"} stroke={i < rating ? "#F54E00" : "#bfc1b7"} />
      ))}
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="border-b last:border-0 cursor-pointer group"
      style={{ borderColor: "#bfc1b7" }}
      onClick={() => setOpen(!open)}
    >
      <div className="flex items-center justify-between py-4 gap-4">
        <p className="font-semibold text-sm leading-relaxed flex-1 group-hover:text-[#F54E00] transition-colors" style={{ color: "#23251d" }}>{q}</p>
        {open ? <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: "#9ea096" }} /> : <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: "#9ea096" }} />}
      </div>
      {open && <p className="text-sm leading-relaxed pb-4 pr-8" style={{ color: "#65675e" }}>{a}</p>}
    </div>
  );
}

// ── 메인 ─────────────────────────────────────────────────────────
export default function LandingPage() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled]             = useState(false);
  const productRef = useRef<HTMLDivElement>(null);
  const { profile: snsProfile, posts: instaPosts, shorts: ytShortsManual, fetchedShorts } = useSns();
  const heroBg = useHeroBg();
  const ctaBg  = useCtaBg();

  const ytShorts =
    snsProfile.youtubeAutoFetch && fetchedShorts.length > 0
      ? fetchedShorts.map((s) => ({ id: s.videoId, videoId: s.videoId, title: s.title, sortOrder: 0 }))
      : ytShortsManual;

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const scrollToProducts = () => productRef.current?.scrollIntoView({ behavior: "smooth" });
  const avgRating = (REVIEWS.reduce((s, r) => s + r.rating, 0) / REVIEWS.length).toFixed(1);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#fdfdf8", fontFamily: "var(--font-ibm-plex-sans), 'IBM Plex Sans', sans-serif" }}>

      {/* ── 내비 ──────────────────────────────────────────────── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-200"
        style={{
          backgroundColor: scrolled ? "rgba(253,253,248,0.97)" : "#fdfdf8",
          borderBottom: `1px solid ${scrolled ? "#bfc1b7" : "transparent"}`,
          backdropFilter: scrolled ? "blur(12px)" : "none",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wind className="w-5 h-5" style={{ color: "#F54E00" }} />
            <span className="font-bold text-base" style={{ color: "#23251d" }}>구름상회</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-semibold" style={{ color: "#65675e" }}>
            {[["상품 안내", ""], ["안전 수칙", "#safety"], ["FAQ", "#faq"], ["후기", "#reviews"]].map(([label, href]) =>
              href ? (
                <a key={label} href={href} className="hover:text-[#F54E00] transition-colors">{label}</a>
              ) : (
                <button key={label} onClick={scrollToProducts} className="hover:text-[#F54E00] transition-colors">{label}</button>
              )
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/booking")}
              className="hidden md:flex items-center gap-1.5 px-4 py-2 rounded text-sm font-semibold text-white transition-opacity hover:opacity-70"
              style={{ backgroundColor: "#1e1f23", borderRadius: "6px" }}
            >
              예약하기 <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button className="md:hidden p-1.5" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{ color: "#4d4f46" }}>
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {/* 모바일 메뉴 */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t px-6 py-4 space-y-3" style={{ borderColor: "#bfc1b7", backgroundColor: "#fdfdf8" }}>
            <button onClick={() => { scrollToProducts(); setMobileMenuOpen(false); }} className="block w-full text-left text-sm font-semibold hover:text-[#F54E00] transition-colors" style={{ color: "#4d4f46" }}>상품 안내</button>
            <a href="#safety" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-semibold hover:text-[#F54E00] transition-colors" style={{ color: "#4d4f46" }}>안전 수칙</a>
            <a href="#faq"    onClick={() => setMobileMenuOpen(false)} className="block text-sm font-semibold hover:text-[#F54E00] transition-colors" style={{ color: "#4d4f46" }}>FAQ</a>
            <a href="#reviews" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-semibold hover:text-[#F54E00] transition-colors" style={{ color: "#4d4f46" }}>후기</a>
            <button onClick={() => { router.push("/booking"); setMobileMenuOpen(false); }} className="w-full mt-2 py-2.5 rounded text-sm font-semibold text-white" style={{ backgroundColor: "#1e1f23", borderRadius: "6px" }}>예약하기</button>
          </div>
        )}
      </nav>

      {/* ── 히어로 ────────────────────────────────────────────── */}
      <section
        className="relative pt-32 pb-24 px-6 overflow-hidden"
        style={{
          background: heroBg.imageDataUrl && heroBg.enabled ? undefined : "#fdfdf8",
          backgroundColor: heroBg.imageDataUrl && heroBg.enabled ? "#1e1f23" : undefined,
        }}
      >
        {heroBg.imageDataUrl && heroBg.enabled && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={heroBg.imageDataUrl} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: `rgba(30,31,35,${(heroBg.overlayOpacity / 100).toFixed(2)})` }} />
          </>
        )}

        <div className="relative z-10 max-w-4xl mx-auto">
          {/* 레이블 */}
          <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-widest"
            style={{ backgroundColor: heroBg.imageDataUrl && heroBg.enabled ? "rgba(245,78,0,0.15)" : "#e5e7e0", color: "#F54E00", border: "1px solid rgba(245,78,0,0.3)", borderRadius: "4px" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#F54E00] animate-pulse" />
            오늘 날씨 🟢 비행 최적
          </div>

          {/* 헤드라인 */}
          <h1
            className="font-bold leading-tight mb-6"
            style={{
              fontSize: "clamp(2.4rem, 6vw, 4rem)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
              color: heroBg.imageDataUrl && heroBg.enabled ? "#fdfdf8" : "#23251d",
            }}
          >
            하늘을 직접<br />
            <span style={{ color: "#F54E00" }}>날아보세요</span>
          </h1>

          <p className="mb-10 max-w-xl text-lg leading-relaxed" style={{ color: heroBg.imageDataUrl && heroBg.enabled ? "rgba(253,253,248,0.75)" : "#65675e", fontWeight: 400, lineHeight: 1.65 }}>
            전문 파일럿과 함께하는 안전한 체험 패러글라이딩.<br />
            초보자도 10분이면 하늘을 날 수 있습니다.
          </p>

          {/* CTA 버튼 */}
          <div className="flex flex-wrap gap-3 mb-14">
            <button
              onClick={() => router.push("/booking")}
              className="flex items-center gap-2 px-7 py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-70 active:scale-95"
              style={{ backgroundColor: "#1e1f23", borderRadius: "6px" }}
            >
              지금 예약하기 <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={scrollToProducts}
              className="flex items-center gap-2 px-7 py-3.5 text-sm font-semibold transition-colors hover:text-[#F54E00]"
              style={{
                backgroundColor: heroBg.imageDataUrl && heroBg.enabled ? "rgba(253,253,248,0.1)" : "#e5e7e0",
                color: heroBg.imageDataUrl && heroBg.enabled ? "#fdfdf8" : "#4d4f46",
                border: `1px solid ${heroBg.imageDataUrl && heroBg.enabled ? "rgba(253,253,248,0.2)" : "#bfc1b7"}`,
                borderRadius: "6px",
              }}
            >
              상품 보기
            </button>
          </div>

          {/* 통계 */}
          <div className="flex flex-wrap gap-8">
            {[
              { value: "2,400+", label: "누적 비행" },
              { value: "4.9",    label: "평균 별점" },
              { value: "100%",   label: "안전 운항" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-2xl font-bold" style={{ fontWeight: 800, color: heroBg.imageDataUrl && heroBg.enabled ? "#fdfdf8" : "#23251d" }}>{s.value}</p>
                <p className="text-sm mt-0.5" style={{ color: heroBg.imageDataUrl && heroBg.enabled ? "rgba(253,253,248,0.5)" : "#9ea096" }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 스크롤 인디케이터 */}
        {!(heroBg.imageDataUrl && heroBg.enabled) && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce" style={{ color: "#bfc1b7" }}>
            <ChevronDown className="w-5 h-5" />
          </div>
        )}
      </section>

      {/* ── 상품 ─────────────────────────────────────────────── */}
      <section ref={productRef} className="py-20 px-6" style={{ backgroundColor: "#eeefe9" }}>
        <div className="max-w-5xl mx-auto">
          <div className="mb-12">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#F54E00" }}>EXPERIENCE</p>
            <h2 className="font-bold mb-3" style={{ fontSize: "2rem", fontWeight: 700, color: "#23251d", lineHeight: 1.3 }}>
              내게 맞는 비행을 선택하세요
            </h2>
            <p className="text-base" style={{ color: "#65675e" }}>모든 상품은 전문 파일럿 동반 탠덤 비행입니다</p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {PRODUCTS.map((p) => (
              <div
                key={p.id}
                className="rounded flex flex-col relative group"
                style={{
                  backgroundColor: p.featured ? "#1e1f23" : "#fdfdf8",
                  border: p.featured ? "none" : "1px solid #bfc1b7",
                  borderRadius: "6px",
                  padding: "28px",
                  boxShadow: p.featured ? "0px 25px 50px -12px rgba(0,0,0,0.25)" : "none",
                }}
              >
                {p.badge && (
                  <span className="absolute top-5 right-5 text-xs font-bold px-2.5 py-1 rounded" style={{ backgroundColor: "#F54E00", color: "#fdfdf8", borderRadius: "9999px" }}>
                    {p.badge}
                  </span>
                )}

                <div className="mb-6">
                  <p className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: p.featured ? "rgba(253,253,248,0.4)" : "#9ea096" }}>{p.subtitle}</p>
                  <h3 className="font-bold" style={{ fontSize: "1.5rem", fontWeight: 700, color: p.featured ? "#fdfdf8" : "#23251d" }}>{p.name}</h3>
                </div>

                <div className="mb-6">
                  <span className="font-bold" style={{ fontSize: "2rem", fontWeight: 800, color: p.featured ? "#F54E00" : "#23251d" }}>
                    {p.price.toLocaleString()}
                  </span>
                  <span className="text-sm ml-1" style={{ color: p.featured ? "rgba(253,253,248,0.4)" : "#9ea096" }}>원 / 1인</span>
                </div>

                <div className="flex items-center gap-1.5 mb-6">
                  <Clock className="w-3.5 h-3.5" style={{ color: p.featured ? "rgba(253,253,248,0.5)" : "#9ea096" }} />
                  <span className="text-sm" style={{ color: p.featured ? "rgba(253,253,248,0.6)" : "#65675e" }}>{p.duration}</span>
                </div>

                <div className="space-y-2 flex-1 mb-6">
                  {p.features.map((f) => (
                    <div key={f} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: p.featured ? "#F54E00" : "#4d4f46" }} />
                      <span className="text-sm" style={{ color: p.featured ? "rgba(253,253,248,0.8)" : "#4d4f46" }}>{f}</span>
                    </div>
                  ))}
                </div>

                {p.optionLabel && (
                  <p className="text-xs mb-4 px-3 py-2 rounded" style={{ color: p.featured ? "rgba(253,253,248,0.5)" : "#9ea096", backgroundColor: p.featured ? "rgba(253,253,248,0.06)" : "#eeefe9", borderRadius: "4px" }}>
                    + 옵션: {p.optionLabel}
                  </p>
                )}

                <button
                  onClick={() => router.push(`/booking?product=${p.id}`)}
                  className="w-full py-3 text-sm font-semibold transition-opacity hover:opacity-70 active:scale-95"
                  style={{
                    backgroundColor: p.featured ? "#F54E00" : "#1e1f23",
                    color: "#fdfdf8",
                    borderRadius: "6px",
                  }}
                >
                  이 상품으로 예약
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 인스타그램 피드 ─────────────────────────────────── */}
      {instaPosts.length > 0 && snsProfile.instagramCount > 0 && (
        <section className="py-20 px-6" style={{ backgroundColor: "#fdfdf8" }}>
          <div className="max-w-5xl mx-auto">
            <div className="mb-10">
              <p className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: "#E1306C" }}>
                <Instagram className="w-3.5 h-3.5" /> INSTAGRAM
              </p>
              <h2 className="font-bold mb-2" style={{ fontSize: "1.75rem", fontWeight: 700, color: "#23251d" }}>생생한 비행 순간들</h2>
              <a href={snsProfile.instagramUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold hover:text-[#F54E00] transition-colors" style={{ color: "#65675e" }}>
                {snsProfile.instagramHandle} <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {instaPosts.slice(0, snsProfile.instagramCount).map((post) => {
                const inner = (
                  <div className="relative rounded overflow-hidden aspect-square group cursor-pointer" style={{ borderRadius: "4px" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={post.imageUrl} alt={post.caption} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center" style={{ background: "rgba(245,78,0,0.8)" }}>
                      <Instagram className="w-8 h-8 text-white" />
                    </div>
                    {post.caption && (
                      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
                        <p className="text-white text-xs font-medium line-clamp-2">{post.caption}</p>
                      </div>
                    )}
                  </div>
                );
                return post.link ? <a key={post.id} href={post.link} target="_blank" rel="noreferrer">{inner}</a> : <div key={post.id}>{inner}</div>;
              })}
            </div>
            <div className="mt-8">
              <a href={snsProfile.instagramUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-70" style={{ background: "linear-gradient(135deg,#E1306C,#F58529)", borderRadius: "6px" }}>
                <Instagram className="w-4 h-4" /> 인스타그램에서 더 보기
              </a>
            </div>
          </div>
        </section>
      )}

      {/* ── 유튜브 쇼츠 ──────────────────────────────────────── */}
      {ytShorts.length > 0 && snsProfile.youtubeCount > 0 && (
        <section className="py-20 px-6" style={{ backgroundColor: "#1e1f23" }}>
          <div className="max-w-5xl mx-auto">
            <div className="mb-10">
              <p className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: "#FF0000" }}>
                <Youtube className="w-4 h-4" /> YOUTUBE SHORTS
              </p>
              <h2 className="font-bold mb-2" style={{ fontSize: "1.75rem", fontWeight: 700, color: "#fdfdf8" }}>영상으로 만나는 구름상회</h2>
              <a href={snsProfile.youtubeChannelUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold hover:text-[#F54E00] transition-colors" style={{ color: "rgba(253,253,248,0.5)" }}>
                {snsProfile.youtubeChannelName} <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {ytShorts.slice(0, snsProfile.youtubeCount).map((s) => (
                <a key={s.id} href={`https://youtube.com/shorts/${s.videoId}`} target="_blank" rel="noreferrer" className="relative rounded overflow-hidden group cursor-pointer" style={{ aspectRatio: "9/16", borderRadius: "4px" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={youtubeThumbnail(s.videoId)} alt={s.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-110" style={{ backgroundColor: "rgba(255,0,0,0.9)" }}>
                      <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                    </div>
                  </div>
                  {s.title && <div className="absolute bottom-0 left-0 right-0 p-3"><p className="text-white text-xs font-medium line-clamp-2">{s.title}</p></div>}
                </a>
              ))}
            </div>
            <div className="mt-8">
              <a href={snsProfile.youtubeChannelUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-70" style={{ backgroundColor: "#FF0000", borderRadius: "6px" }}>
                <Youtube className="w-4 h-4" /> 채널 구독하기
              </a>
            </div>
          </div>
        </section>
      )}

      {/* ── 안전 수칙 ─────────────────────────────────────────── */}
      <section id="safety" className="py-20 px-6" style={{ backgroundColor: "#fdfdf8" }}>
        <div className="max-w-4xl mx-auto">
          <div className="mb-12">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#F54E00" }}>SAFETY FIRST</p>
            <h2 className="font-bold mb-3" style={{ fontSize: "2rem", fontWeight: 700, color: "#23251d" }}>안전이 최우선입니다</h2>
            <p className="text-base" style={{ color: "#65675e" }}>체험 전 아래 안전 수칙을 반드시 확인해 주세요</p>
          </div>

          {/* 안전 배너 */}
          <div className="rounded flex items-center gap-4 px-6 py-5 mb-10" style={{ backgroundColor: "#e5e7e0", border: "1px solid #bfc1b7", borderRadius: "6px" }}>
            <Shield className="w-7 h-7 flex-shrink-0" style={{ color: "#23251d" }} />
            <div>
              <p className="font-bold text-sm" style={{ color: "#23251d" }}>전 파일럿 자격증 보유 · 비행안전 보험 가입</p>
              <p className="text-sm mt-0.5" style={{ color: "#65675e" }}>구름상회의 모든 파일럿은 한국활공협회 공인 자격증 소지자이며, 탑승 전 장비 이상 유무를 반드시 점검합니다.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            {SAFETY.map((s) => (
              <div key={s.title} className="flex gap-4 p-5 rounded group hover:bg-[#f4f4f4] transition-colors" style={{ border: "1px solid #bfc1b7", borderRadius: "4px" }}>
                <span className="text-2xl flex-shrink-0">{s.icon}</span>
                <div>
                  <p className="font-bold text-sm group-hover:text-[#F54E00] transition-colors" style={{ color: "#23251d" }}>{s.title}</p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: "#65675e" }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────── */}
      <section id="faq" className="py-20 px-6" style={{ backgroundColor: "#eeefe9" }}>
        <div className="max-w-2xl mx-auto">
          <div className="mb-12">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#F54E00" }}>FAQ</p>
            <h2 className="font-bold" style={{ fontSize: "2rem", fontWeight: 700, color: "#23251d" }}>자주 묻는 질문</h2>
          </div>

          <div className="rounded p-6" style={{ backgroundColor: "#fdfdf8", border: "1px solid #bfc1b7", borderRadius: "6px" }}>
            {FAQS.map((faq) => <FaqItem key={faq.q} q={faq.q} a={faq.a} />)}
          </div>

          <p className="text-sm mt-6" style={{ color: "#9ea096" }}>
            더 궁금한 점은{" "}
            <button className="font-semibold underline hover:text-[#F54E00] transition-colors" style={{ color: "#4d4f46" }}>카카오톡 채널</button>
            로 문의해 주세요
          </p>
        </div>
      </section>

      {/* ── 후기 ──────────────────────────────────────────────── */}
      <section id="reviews" className="py-20 px-6" style={{ backgroundColor: "#fdfdf8" }}>
        <div className="max-w-5xl mx-auto">
          <div className="mb-12">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#F54E00" }}>REVIEWS</p>
            <h2 className="font-bold mb-4" style={{ fontSize: "2rem", fontWeight: 700, color: "#23251d" }}>실제 체험 후기</h2>
            <div className="flex items-center gap-2">
              <StarRating rating={5} />
              <span className="font-bold text-xl" style={{ color: "#23251d" }}>{avgRating}</span>
              <span className="text-sm" style={{ color: "#9ea096" }}>/ 5.0 · {REVIEWS.length}개 후기</span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {REVIEWS.map((r) => (
              <div key={r.name + r.date} className="p-5 flex flex-col group hover:bg-[#f4f4f4] transition-colors" style={{ backgroundColor: "#fdfdf8", border: "1px solid #bfc1b7", borderRadius: "6px" }}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ backgroundColor: "#e5e7e0", color: "#23251d", borderRadius: "4px" }}>
                      {r.avatar}
                    </div>
                    <div>
                      <p className="font-bold text-sm" style={{ color: "#23251d" }}>{r.name}</p>
                      <p className="text-xs" style={{ color: "#9ea096" }}>{r.date}</p>
                    </div>
                  </div>
                  <StarRating rating={r.rating} />
                </div>
                <span className="inline-flex self-start text-xs font-semibold px-2 py-0.5 mb-3" style={{ backgroundColor: "#e5e7e0", color: "#4d4f46", borderRadius: "9999px" }}>{r.product}</span>
                <p className="text-sm leading-relaxed flex-1" style={{ color: "#65675e", lineHeight: 1.65 }}>{r.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA 배너 ─────────────────────────────────────────── */}
      <section
        className="relative py-20 px-6 text-center overflow-hidden"
        style={{
          backgroundColor: ctaBg.imageDataUrl && ctaBg.enabled ? "#1e1f23" : "#1e1f23",
        }}
      >
        {ctaBg.imageDataUrl && ctaBg.enabled && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ctaBg.imageDataUrl} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: `rgba(30,31,35,${(ctaBg.overlayOpacity / 100).toFixed(2)})` }} />
          </>
        )}
        <div className="relative z-10">
          <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "rgba(253,253,248,0.4)" }}>READY TO FLY?</p>
          <h2 className="font-bold mb-4" style={{ fontSize: "clamp(2rem,5vw,3rem)", fontWeight: 800, color: "#fdfdf8", lineHeight: 1.2 }}>
            오늘, 하늘을 날아보세요
          </h2>
          <p className="mb-10 text-base" style={{ color: "rgba(253,253,248,0.5)" }}>주말 슬롯이 빠르게 마감됩니다</p>
          <button
            onClick={() => router.push("/booking")}
            className="inline-flex items-center gap-2 px-10 py-4 text-base font-semibold text-white transition-all hover:bg-[#F54E00] active:scale-95"
            style={{ backgroundColor: "#F54E00", borderRadius: "6px" }}
          >
            지금 예약하기 <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* ── 푸터 ─────────────────────────────────────────────── */}
      <footer className="py-12 px-6" style={{ backgroundColor: "#23251d" }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-start justify-between gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Wind className="w-5 h-5" style={{ color: "#F54E00" }} />
                <span className="font-bold text-base" style={{ color: "#fdfdf8" }}>구름상회</span>
              </div>
              <p className="text-sm leading-relaxed max-w-xs" style={{ color: "rgba(253,253,248,0.35)" }}>
                하늘을 가장 가까이서 만나는 곳.<br />패러글라이딩 체험비행 전문 업체.
              </p>
            </div>
            <div className="flex gap-12 text-sm" style={{ color: "rgba(253,253,248,0.35)" }}>
              <div className="space-y-2">
                <p className="font-semibold mb-3" style={{ color: "rgba(253,253,248,0.55)" }}>운영 시간</p>
                <p>평일 09:00 ~ 18:00</p>
                <p>주말 07:00 ~ 19:00</p>
                <p>기상 악화 시 당일 공지</p>
              </div>
              <div className="space-y-2">
                <p className="font-semibold mb-3" style={{ color: "rgba(253,253,248,0.55)" }}>문의</p>
                <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /><span>010-0000-0000</span></div>
                <div className="flex items-center gap-2"><MessageCircle className="w-3.5 h-3.5" /><span>카카오톡 채널</span></div>
                <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /><span>강원도 ○○군 ○○면</span></div>
              </div>
            </div>
          </div>
          <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-2 text-xs" style={{ borderTop: "1px solid rgba(253,253,248,0.08)", color: "rgba(253,253,248,0.2)" }}>
            <p>© 2026 구름상회. All rights reserved.</p>
            <p>사업자등록번호 000-00-00000 · 대표 홍길동</p>
          </div>
        </div>
      </footer>

      {/* ── 플로팅 예약 버튼 (모바일) ───────────────────────── */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center z-40 md:hidden">
        <button
          onClick={() => router.push("/booking")}
          className="flex items-center gap-2 px-8 py-3.5 text-sm font-semibold text-white shadow-lg"
          style={{ backgroundColor: "#1e1f23", borderRadius: "6px" }}
        >
          예약하기 <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
}
