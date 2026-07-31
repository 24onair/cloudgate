// 광고 랜딩(/mungyeong, /why-mungyeong) 공용 서버 컴포넌트 조각.
// JS 번들 최소화를 위해 전부 서버 렌더 — 내부 이동은 Link, 전화·외부는 <a>.
import Link from "next/link";
import { Phone, ArrowRight, Star, Wind } from "lucide-react";
import { COMPANY } from "@/lib/company";
import type { LandingProduct, LandingReview } from "@/lib/landing/queries";

// 기존 메인 팔레트와 동일 톤
export const C = {
  bg: "#fdfdf8",
  bgAlt: "#eeefe9",
  ink: "#23251d",
  sub: "#65675e",
  faint: "#9ea096",
  line: "#bfc1b7",
  accent: "#F54E00",
  dark: "#1e1f23",
} as const;

export function LandingNav() {
  return (
    <nav
      className="sticky top-0 z-40 border-b"
      style={{ backgroundColor: "rgba(253,253,248,0.97)", borderColor: C.line, backdropFilter: "blur(12px)" }}
    >
      <div className="max-w-4xl mx-auto px-5 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Wind className="w-5 h-5" style={{ color: C.accent }} />
          <span className="font-bold text-base" style={{ color: C.ink }}>{COMPANY.brand}</span>
        </Link>
        <div className="flex items-center gap-2">
          <a
            href={COMPANY.telHref}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold"
            style={{ backgroundColor: C.bgAlt, color: C.ink, border: `1px solid ${C.line}` }}
          >
            <Phone className="w-3.5 h-3.5" style={{ color: C.accent }} /> {COMPANY.phone}
          </a>
          <Link
            href="/booking"
            className="flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-bold text-white"
            style={{ backgroundColor: C.dark }}
          >
            예약하기 <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </nav>
  );
}

export function LandingHero({ h1, sub }: { h1: React.ReactNode; sub: string }) {
  return (
    <section
      className="px-5 pt-16 pb-14 text-center"
      style={{ background: "linear-gradient(175deg,#020d1f 0%,#0D2B52 45%,#1a4a80 75%,#2A7AE2 100%)" }}
    >
      <div className="max-w-3xl mx-auto">
        <p
          className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-widest"
          style={{ backgroundColor: "rgba(245,78,0,0.18)", color: "#ffb59a", border: "1px solid rgba(245,78,0,0.4)", borderRadius: 4 }}
        >
          ✅ {COMPANY.safetyRecord}
        </p>
        <h1
          className="font-bold mb-5"
          style={{ fontSize: "clamp(1.9rem, 5.5vw, 3rem)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.2, color: "#fdfdf8" }}
        >
          {h1}
        </h1>
        <p className="mb-8 text-base leading-relaxed" style={{ color: "rgba(253,253,248,0.75)" }}>{sub}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <a
            href={COMPANY.telHref}
            className="flex items-center gap-2 px-7 py-3.5 rounded-md text-sm font-bold text-white"
            style={{ backgroundColor: C.accent }}
          >
            <Phone className="w-4 h-4" /> 전화 예약 {COMPANY.phone}
          </a>
          <Link
            href="/booking"
            className="flex items-center gap-2 px-7 py-3.5 rounded-md text-sm font-bold"
            style={{ backgroundColor: "rgba(253,253,248,0.95)", color: C.ink }}
          >
            온라인 예약 <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export function PriceSection({ products, heading }: { products: LandingProduct[]; heading: string }) {
  if (products.length === 0) return null;
  return (
    <section id="price" className="py-14 px-5" style={{ backgroundColor: C.bgAlt }}>
      <div className="max-w-4xl mx-auto">
        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: C.accent }}>PRICE</p>
        <h2 className="font-bold mb-8" style={{ fontSize: "1.6rem", color: C.ink }}>{heading}</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {products.map((p) => (
            <Link
              key={p.id}
              href={`/booking?product=${p.slug}`}
              className="relative rounded-md p-5 flex flex-col"
              style={{
                backgroundColor: p.is_featured ? C.dark : C.bg,
                border: p.is_featured ? "none" : `1px solid ${C.line}`,
              }}
            >
              {p.badge && (
                <span className="absolute top-4 right-4 text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: C.accent, color: "#fff" }}>
                  {p.badge}
                </span>
              )}
              <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: p.is_featured ? "rgba(253,253,248,0.45)" : C.faint }}>
                {p.subtitle}
              </p>
              <p className="font-bold text-lg mb-3" style={{ color: p.is_featured ? "#fdfdf8" : C.ink }}>{p.name}</p>
              <p className="mt-auto">
                <span className="font-bold" style={{ fontSize: "1.6rem", color: p.is_featured ? C.accent : C.ink }}>
                  {p.price.toLocaleString()}
                </span>
                <span className="text-sm ml-1" style={{ color: p.is_featured ? "rgba(253,253,248,0.45)" : C.faint }}>
                  원 / 1인{p.duration_min ? ` · 약 ${p.duration_min}분` : ""}
                </span>
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ReviewSection({ reviews }: { reviews: LandingReview[] }) {
  if (reviews.length === 0) return null;
  return (
    <section className="py-14 px-5" style={{ backgroundColor: C.bg }}>
      <div className="max-w-4xl mx-auto">
        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: C.accent }}>REVIEWS</p>
        <h2 className="font-bold mb-8" style={{ fontSize: "1.6rem", color: C.ink }}>실제 체험 후기</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-md p-5" style={{ border: `1px solid ${C.line}` }}>
              <div className="flex items-center justify-between mb-3">
                <p className="font-bold text-sm" style={{ color: C.ink }}>{r.name}</p>
                <span className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5" fill={i < r.rating ? C.accent : "none"} stroke={i < r.rating ? C.accent : C.line} />
                  ))}
                </span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: C.sub }}>
                {r.body.length > 100 ? `${r.body.slice(0, 100)}…` : r.body}
              </p>
            </div>
          ))}
        </div>
        <Link href="/review" className="inline-block mt-6 text-sm font-semibold" style={{ color: C.sub }}>
          후기 더 보기 →
        </Link>
      </div>
    </section>
  );
}

export function CtaSection() {
  return (
    <section
      className="py-16 px-5 text-center"
      style={{ background: "linear-gradient(135deg,#0D2B52 0%,#1a4a80 50%,#2A7AE2 100%)" }}
    >
      <h2 className="font-bold mb-3" style={{ fontSize: "1.8rem", fontWeight: 800, color: "#fdfdf8" }}>
        문경 하늘, 오늘 예약하세요
      </h2>
      <p className="mb-8 text-sm" style={{ color: "rgba(253,253,248,0.6)" }}>
        {COMPANY.safetyRecord} · 전문 파일럿 동승 · 초보자 가능
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <a href={COMPANY.telHref} className="inline-flex items-center gap-2 px-8 py-3.5 rounded-md text-sm font-bold text-white" style={{ backgroundColor: C.accent }}>
          <Phone className="w-4 h-4" /> {COMPANY.phone}
        </a>
        <Link href="/booking" className="inline-flex items-center gap-2 px-8 py-3.5 rounded-md text-sm font-bold" style={{ backgroundColor: "#fdfdf8", color: C.ink }}>
          온라인 예약 <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="py-10 px-5" style={{ backgroundColor: C.ink }}>
      <div className="max-w-4xl mx-auto text-sm" style={{ color: "rgba(253,253,248,0.45)" }}>
        <p className="font-bold mb-2" style={{ color: "rgba(253,253,248,0.8)" }}>{COMPANY.name}</p>
        <p>{COMPANY.address}</p>
        <p>이륙장: {COMPANY.launchSite}</p>
        <p className="mt-1">대표번호: <a href={COMPANY.telHref} style={{ color: "rgba(253,253,248,0.7)" }}>{COMPANY.phone}</a></p>
        <div className="flex gap-4 mt-4 text-xs">
          <Link href="/terms" style={{ color: "rgba(253,253,248,0.45)" }}>이용약관</Link>
          <Link href="/privacy" style={{ color: "rgba(253,253,248,0.6)", fontWeight: 600 }}>개인정보처리방침</Link>
          <Link href="/refund" style={{ color: "rgba(253,253,248,0.45)" }}>취소·환불 정책</Link>
        </div>
      </div>
    </footer>
  );
}
