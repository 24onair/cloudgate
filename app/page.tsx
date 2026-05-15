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
import { useHeroBg, useCtaBg, useFaqBg } from "@/lib/heroStore";
import { useFaqs } from "@/lib/faqStore";
import { useLogo } from "@/lib/logoStore";
import { useFooter } from "@/lib/footerStore";
import { usePageContent } from "@/lib/pageContentStore";
import { useReviews } from "@/lib/reviewStore";

// ── DB 상품 타입 ──────────────────────────────────────────────────
interface DbProduct {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  price: number;
  duration_min: number | null;
  features: string[] | null;
  badge: string | null;
  is_featured: boolean;
  is_active: boolean;
  sort_order: number;
}
interface DbOption {
  id: string;
  product_id: string | null;
  name: string;
  price: number;
}

// DB 상품 → 홈 카드용 포맷 변환
function makeOptionLabel(productSlug: string, dbProducts: DbProduct[], dbOptions: DbOption[]): string {
  const product = dbProducts.find((p) => p.slug === productSlug);
  if (!product) return "";
  // 이 상품 전용 옵션 또는 전체 공통 옵션(product_id=null)
  const opts = dbOptions.filter(
    (o) => o.product_id === product.id || o.product_id === null
  );
  if (opts.length === 0) return "";
  const o = opts[0];
  return `${o.name} +${o.price.toLocaleString()}원`;
}

// ── 데이터 ────────────────────────────────────────────────────────
// PRODUCTS, SAFETY 는 pageContentStore 에서 런타임에 로드됩니다.

// REVIEWS 는 reviewStore 에서 승인된 것만 로드됩니다.

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

function FaqItemOverlay({ q, a, darkMode }: { q: string; a: string; darkMode: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="border-b last:border-0 cursor-pointer group"
      style={{ borderColor: darkMode ? "rgba(253,253,248,0.12)" : "#bfc1b7" }}
      onClick={() => setOpen(!open)}
    >
      <div className="flex items-center justify-between py-4 gap-4">
        <p
          className="font-semibold text-sm leading-relaxed flex-1 group-hover:text-[#F54E00] transition-colors"
          style={{ color: darkMode ? "rgba(253,253,248,0.9)" : "#23251d" }}
        >
          {q}
        </p>
        {open
          ? <ChevronUp  className="w-4 h-4 flex-shrink-0" style={{ color: darkMode ? "rgba(253,253,248,0.4)" : "#9ea096" }} />
          : <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: darkMode ? "rgba(253,253,248,0.4)" : "#9ea096" }} />
        }
      </div>
      {open && (
        <p
          className="text-sm leading-relaxed pb-4 pr-8"
          style={{ color: darkMode ? "rgba(253,253,248,0.6)" : "#65675e" }}
        >
          {a}
        </p>
      )}
    </div>
  );
}

// ── 메인 ─────────────────────────────────────────────────────────
export default function LandingPage() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled]             = useState(false);
  const productRef = useRef<HTMLDivElement>(null);
  const logo    = useLogo();
  const footer  = useFooter();
  const content = usePageContent();
  const reviews = useReviews("approved");
  const { profile: snsProfile, posts: instaPosts, shorts: ytShortsManual, fetchedShorts } = useSns();
  const heroBg = useHeroBg();
  const ctaBg  = useCtaBg();
  const faqBg  = useFaqBg();
  const faqs   = useFaqs();

  const ytShorts =
    snsProfile.youtubeAutoFetch && fetchedShorts.length > 0
      ? fetchedShorts.map((s) => ({ id: s.videoId, videoId: s.videoId, title: s.title, sortOrder: 0 }))
      : ytShortsManual;

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // ── DB 상품 실시간 조회 ──────────────────────────────────────────
  const [dbProducts, setDbProducts] = useState<DbProduct[]>([]);
  const [dbOptions,  setDbOptions]  = useState<DbOption[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/products").then((r) => r.ok ? r.json() : []),
      fetch("/api/product-options").then((r) => r.ok ? r.json() : []),
    ]).then(([prods, opts]) => {
      if (Array.isArray(prods)) setDbProducts(prods);
      if (Array.isArray(opts))  setDbOptions(opts);
    }).catch(() => {});
  }, []);

  // DB 상품이 로드되면 사용, 아직 없으면 pageContent 폴백
  const liveProducts = dbProducts.length > 0 ? dbProducts : null;

  const scrollToProducts = () => productRef.current?.scrollIntoView({ behavior: "smooth" });
  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : "—";

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
            {logo.imageDataUrl
              /* eslint-disable-next-line @next/next/no-img-element */
              ? <img src={logo.imageDataUrl} alt={logo.text} className="h-8 w-auto object-contain" />
              : <Wind className="w-5 h-5" style={{ color: "#F54E00" }} />
            }
            {(!logo.imageDataUrl || logo.showText) && (
              <span className="font-bold text-base" style={{ color: "#23251d" }}>{logo.text || "구름상회"}</span>
            )}
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
          background: heroBg.imageDataUrl && heroBg.enabled
            ? undefined
            : "#fdfdf8",
          backgroundColor: heroBg.imageDataUrl && heroBg.enabled ? "#020d1f" : undefined,
        }}
      >
        {heroBg.imageDataUrl && heroBg.enabled && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={heroBg.imageDataUrl} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: heroBg.objectPosition ?? "50% 50%" }} />
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

        <div className="relative z-10 max-w-4xl mx-auto">
          {/* 레이블 */}
          <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-widest"
            style={{ backgroundColor: heroBg.imageDataUrl && heroBg.enabled ? "rgba(245,78,0,0.15)" : "#e5e7e0", color: "#F54E00", border: "1px solid rgba(245,78,0,0.3)", borderRadius: "4px" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#F54E00] animate-pulse" />
            {content.heroBadge}
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
            {content.heroHeadline1}<br />
            <span style={{ color: "#F54E00" }}>{content.heroHeadline2}</span>
          </h1>

          <p className="mb-10 max-w-xl text-lg leading-relaxed whitespace-pre-line" style={{ color: heroBg.imageDataUrl && heroBg.enabled ? "rgba(253,253,248,0.75)" : "#65675e", fontWeight: 400, lineHeight: 1.65 }}>
            {content.heroSubtext}
          </p>

          {/* CTA 버튼 */}
          <div className="flex flex-wrap gap-3 mb-14">
            <button
              onClick={() => router.push("/booking")}
              className="flex items-center gap-2 px-7 py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-70 active:scale-95"
              style={{ backgroundColor: "#1e1f23", borderRadius: "6px" }}
            >
              {content.heroCtaButton} <ArrowRight className="w-4 h-4" />
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
              {content.heroSecondaryButton}
            </button>
          </div>

          {/* 통계 */}
          <div className="flex flex-wrap gap-8">
            {[
              { value: content.heroStat1Value, label: content.heroStat1Label },
              { value: content.heroStat2Value, label: content.heroStat2Label },
              { value: content.heroStat3Value, label: content.heroStat3Label },
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
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#F54E00" }}>{content.productLabel}</p>
            <h2 className="font-bold mb-3" style={{ fontSize: "2rem", fontWeight: 700, color: "#23251d", lineHeight: 1.3 }}>
              {content.productHeading}
            </h2>
            <p className="text-base" style={{ color: "#65675e" }}>{content.productSubtext}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {liveProducts
              ? /* ── DB 상품 (실시간) ─────────────────── */ liveProducts.map((p) => {
                  const featured    = p.is_featured;
                  const duration    = p.duration_min ? `약 ${p.duration_min}분` : "";
                  const features    = Array.isArray(p.features) && p.features.length > 0 ? p.features : [];
                  const optionLabel = makeOptionLabel(p.slug, dbProducts, dbOptions);
                  return (
                    <div
                      key={p.slug}
                      className="rounded flex flex-col relative group"
                      style={{
                        backgroundColor: featured ? "#1e1f23" : "#fdfdf8",
                        border: featured ? "none" : "1px solid #bfc1b7",
                        borderRadius: "6px",
                        padding: "28px",
                        boxShadow: featured ? "0px 25px 50px -12px rgba(0,0,0,0.25)" : "none",
                      }}
                    >
                      {p.badge && (
                        <span className="absolute top-5 right-5 text-xs font-bold px-2.5 py-1 rounded" style={{ backgroundColor: "#F54E00", color: "#fdfdf8", borderRadius: "9999px" }}>
                          {p.badge}
                        </span>
                      )}
                      <div className="mb-6">
                        <p className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: featured ? "rgba(253,253,248,0.4)" : "#9ea096" }}>{p.subtitle}</p>
                        <h3 className="font-bold" style={{ fontSize: "1.5rem", fontWeight: 700, color: featured ? "#fdfdf8" : "#23251d" }}>{p.name}</h3>
                      </div>
                      <div className="mb-6">
                        <span className="font-bold" style={{ fontSize: "2rem", fontWeight: 800, color: featured ? "#F54E00" : "#23251d" }}>
                          {p.price.toLocaleString()}
                        </span>
                        <span className="text-sm ml-1" style={{ color: featured ? "rgba(253,253,248,0.4)" : "#9ea096" }}>원 / 1인</span>
                      </div>
                      {duration && (
                        <div className="flex items-center gap-1.5 mb-6">
                          <Clock className="w-3.5 h-3.5" style={{ color: featured ? "rgba(253,253,248,0.5)" : "#9ea096" }} />
                          <span className="text-sm" style={{ color: featured ? "rgba(253,253,248,0.6)" : "#65675e" }}>{duration}</span>
                        </div>
                      )}
                      <div className="space-y-2 flex-1 mb-6">
                        {features.map((f) => (
                          <div key={f} className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: featured ? "#F54E00" : "#4d4f46" }} />
                            <span className="text-sm" style={{ color: featured ? "rgba(253,253,248,0.8)" : "#4d4f46" }}>{f}</span>
                          </div>
                        ))}
                      </div>
                      {optionLabel && (
                        <p className="text-xs mb-4 px-3 py-2 rounded" style={{ color: featured ? "rgba(253,253,248,0.5)" : "#9ea096", backgroundColor: featured ? "rgba(253,253,248,0.06)" : "#eeefe9", borderRadius: "4px" }}>
                          + 옵션: {optionLabel}
                        </p>
                      )}
                      <button
                        onClick={() => router.push(`/booking?product=${p.slug}`)}
                        className="w-full py-3 text-sm font-semibold transition-opacity hover:opacity-70 active:scale-95"
                        style={{ backgroundColor: featured ? "#F54E00" : "#1e1f23", color: "#fdfdf8", borderRadius: "6px" }}
                      >
                        이 상품으로 예약
                      </button>
                    </div>
                  );
                })
              : /* ── pageContent 폴백 (DB 로딩 전) ──── */ content.products.map((p) => (
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
                      style={{ backgroundColor: p.featured ? "#F54E00" : "#1e1f23", color: "#fdfdf8", borderRadius: "6px" }}
                    >
                      이 상품으로 예약
                    </button>
                  </div>
                ))
            }
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
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#F54E00" }}>{content.safetyLabel}</p>
            <h2 className="font-bold mb-3" style={{ fontSize: "2rem", fontWeight: 700, color: "#23251d" }}>{content.safetyHeading}</h2>
            <p className="text-base" style={{ color: "#65675e" }}>{content.safetySubtext}</p>
          </div>

          {/* 안전 배너 */}
          <div className="rounded flex items-center gap-4 px-6 py-5 mb-10" style={{ backgroundColor: "#e5e7e0", border: "1px solid #bfc1b7", borderRadius: "6px" }}>
            <Shield className="w-7 h-7 flex-shrink-0" style={{ color: "#23251d" }} />
            <div>
              <p className="font-bold text-sm" style={{ color: "#23251d" }}>{content.safetyBannerTitle}</p>
              <p className="text-sm mt-0.5" style={{ color: "#65675e" }}>{content.safetyBannerDesc}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            {content.safetyItems.map((s) => (
              <div key={s.id} className="flex gap-4 p-5 rounded group hover:bg-[#f4f4f4] transition-colors" style={{ border: "1px solid #bfc1b7", borderRadius: "4px" }}>
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
      <section
        id="faq"
        className="relative py-20 px-6 overflow-hidden"
        style={{
          background: faqBg.imageDataUrl && faqBg.enabled
            ? undefined
            : "#eeefe9",
          backgroundColor: faqBg.imageDataUrl && faqBg.enabled ? "#0D2B52" : undefined,
        }}
      >
        {faqBg.imageDataUrl && faqBg.enabled && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={faqBg.imageDataUrl} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: faqBg.objectPosition ?? "50% 50%" }} />
            {/* 브랜드 그라데이션 오버레이 */}
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(175deg,
                  rgba(2,13,31,${(faqBg.overlayOpacity / 100).toFixed(2)}) 0%,
                  rgba(13,43,82,${Math.min(1, faqBg.overlayOpacity / 100 + 0.05).toFixed(2)}) 35%,
                  rgba(26,74,128,${Math.max(0, faqBg.overlayOpacity / 100 - 0.05).toFixed(2)}) 65%,
                  rgba(42,122,226,${Math.max(0, faqBg.overlayOpacity / 100 - 0.15).toFixed(2)}) 100%)`,
              }}
            />
          </>
        )}

        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="mb-12">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#F54E00" }}>{content.faqLabel}</p>
            <h2
              className="font-bold"
              style={{ fontSize: "2rem", fontWeight: 700, lineHeight: 1.3, color: faqBg.imageDataUrl && faqBg.enabled ? "#fdfdf8" : "#23251d" }}
            >
              {content.faqHeading}
            </h2>
          </div>

          <div
            className="rounded p-6"
            style={{
              backgroundColor: faqBg.imageDataUrl && faqBg.enabled ? "rgba(253,253,248,0.07)" : "#fdfdf8",
              border: `1px solid ${faqBg.imageDataUrl && faqBg.enabled ? "rgba(253,253,248,0.15)" : "#bfc1b7"}`,
              borderRadius: "6px",
            }}
          >
            {faqs.map((faq) => (
              <FaqItemOverlay key={faq.id} q={faq.q} a={faq.a} darkMode={!!(faqBg.imageDataUrl && faqBg.enabled)} />
            ))}
          </div>

          <p className="text-sm mt-6 whitespace-pre-line" style={{ color: faqBg.imageDataUrl && faqBg.enabled ? "rgba(253,253,248,0.45)" : "#9ea096" }}>
            {content.faqNote}
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
              <span className="text-sm" style={{ color: "#9ea096" }}>/ 5.0 · {reviews.length}개 후기</span>
            </div>
          </div>

          {reviews.length === 0 ? (
            <p className="text-center py-12 text-sm" style={{ color: "#bfc1b7" }}>아직 등록된 후기가 없습니다</p>
          ) : (
            <div className="grid md:grid-cols-3 gap-4">
              {reviews.map((r) => (
                <div key={r.id} className="p-5 flex flex-col group hover:bg-[#f4f4f4] transition-colors" style={{ backgroundColor: "#fdfdf8", border: "1px solid #bfc1b7", borderRadius: "6px" }}>
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
                  {r.product && <span className="inline-flex self-start text-xs font-semibold px-2 py-0.5 mb-3" style={{ backgroundColor: "#e5e7e0", color: "#4d4f46", borderRadius: "9999px" }}>{r.product}</span>}
                  {r.images.length > 0 && (
                    <div className="flex gap-1.5 mb-3">
                      {r.images.slice(0, 3).map((img, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={i} src={img} alt="" className="w-16 h-16 object-cover rounded-lg" />
                      ))}
                    </div>
                  )}
                  <p className="text-sm leading-relaxed flex-1" style={{ color: "#65675e", lineHeight: 1.65 }}>{r.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── CTA 배너 ─────────────────────────────────────────── */}
      <section
        className="relative py-20 px-6 text-center overflow-hidden"
        style={{
          background: ctaBg.imageDataUrl && ctaBg.enabled
            ? undefined
            : "linear-gradient(135deg, #0D2B52 0%, #1a4a80 50%, #2A7AE2 100%)",
          backgroundColor: ctaBg.imageDataUrl && ctaBg.enabled ? "#0D2B52" : undefined,
        }}
      >
        {ctaBg.imageDataUrl && ctaBg.enabled && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ctaBg.imageDataUrl} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: ctaBg.objectPosition ?? "50% 50%" }} />
            {/* 브랜드 그라데이션 오버레이 */}
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(135deg,
                  rgba(13,43,82,${(ctaBg.overlayOpacity / 100).toFixed(2)}) 0%,
                  rgba(26,74,128,${Math.max(0, ctaBg.overlayOpacity / 100 - 0.05).toFixed(2)}) 50%,
                  rgba(42,122,226,${Math.max(0, ctaBg.overlayOpacity / 100 - 0.15).toFixed(2)}) 100%)`,
              }}
            />
          </>
        )}
        <div className="relative z-10">
          <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "rgba(253,253,248,0.4)" }}>{content.ctaLabel}</p>
          <h2 className="font-bold mb-4" style={{ fontSize: "clamp(2rem,5vw,3rem)", fontWeight: 800, color: "#fdfdf8", lineHeight: 1.2 }}>
            {content.ctaHeading}
          </h2>
          <p className="mb-10 text-base" style={{ color: "rgba(253,253,248,0.5)" }}>{content.ctaSubtext}</p>
          <button
            onClick={() => router.push("/booking")}
            className="inline-flex items-center gap-2 px-10 py-4 text-base font-semibold text-white transition-all hover:bg-[#F54E00] active:scale-95"
            style={{ backgroundColor: "#F54E00", borderRadius: "6px" }}
          >
            {content.ctaButton} <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* ── 푸터 ─────────────────────────────────────────────── */}
      <footer className="py-12 px-6" style={{ backgroundColor: "#23251d" }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-start justify-between gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                {logo.imageDataUrl
                  /* eslint-disable-next-line @next/next/no-img-element */
                  ? <img src={logo.imageDataUrl} alt={logo.text} className="h-7 w-auto object-contain" style={{ filter: "brightness(0) invert(1)" }} />
                  : <Wind className="w-5 h-5" style={{ color: "#F54E00" }} />
                }
                {(!logo.imageDataUrl || logo.showText) && (
                  <span className="font-bold text-base" style={{ color: "#fdfdf8" }}>{logo.text || "구름상회"}</span>
                )}
              </div>
              <p className="text-sm leading-relaxed max-w-xs whitespace-pre-line" style={{ color: "rgba(253,253,248,0.35)" }}>
                {footer.tagline}
              </p>
            </div>
            <div className="flex gap-12 text-sm" style={{ color: "rgba(253,253,248,0.35)" }}>
              <div className="space-y-2">
                <p className="font-semibold mb-3" style={{ color: "rgba(253,253,248,0.55)" }}>운영 시간</p>
                {footer.hoursWeekday && <p>{footer.hoursWeekday}</p>}
                {footer.hoursWeekend && <p>{footer.hoursWeekend}</p>}
                {footer.hoursNotice  && <p>{footer.hoursNotice}</p>}
              </div>
              <div className="space-y-2">
                <p className="font-semibold mb-3" style={{ color: "rgba(253,253,248,0.55)" }}>문의</p>
                {footer.phone   && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /><span>{footer.phone}</span></div>}
                {footer.kakao   && <div className="flex items-center gap-2"><MessageCircle className="w-3.5 h-3.5" /><span>{footer.kakao}</span></div>}
                {footer.address && <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /><span>{footer.address}</span></div>}
              </div>
            </div>
          </div>
          <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-2 text-xs" style={{ borderTop: "1px solid rgba(253,253,248,0.08)", color: "rgba(253,253,248,0.2)" }}>
            <p>{footer.copyright}</p>
            <p>{footer.bizInfo}</p>
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
