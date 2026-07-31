// 광고그룹 B(탐색) 랜딩 — 키워드: 문경가볼만한곳·문경액티비티·문경놀거리·문경여행 등
// 전부 서버 렌더(JS 최소) — 네이버 크롤러가 JS 없이 본문·가격·전화를 읽는다.
import type { Metadata } from "next";
import { COMPANY } from "@/lib/company";
import { getActiveProducts, getApprovedReviews } from "@/lib/landing/queries";
import {
  C,
  LandingNav,
  LandingHero,
  PriceSection,
  ReviewSection,
  CtaSection,
  LandingFooter,
} from "@/components/landing/AdLandingParts";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "문경 가볼만한 곳 — 패러글라이딩 체험",
  description: `문경 여행 필수 코스, 문경 액티비티의 하이라이트 패러글라이딩 체험. ${COMPANY.safetyRecord}. 전화 ${COMPANY.phone}`,
};

const ACTIVITIES = [
  {
    title: "패러글라이딩 체험비행",
    desc: `문경 액티비티의 하이라이트. 전문 파일럿과 2인승으로 비행하므로 초보자도 교육 10분이면 하늘에서 문경을 내려다볼 수 있습니다. ${COMPANY.safetyRecord}.`,
    tag: "추천 1위",
  },
  {
    title: "문경새재 도립공원",
    desc: "맨발로 걷는 옛길과 드라마 세트장. 패러글라이딩 전후로 둘러보기 좋은 문경 대표 볼거리입니다.",
    tag: "도보 여행",
  },
  {
    title: "문경 모노레일 · 짚라인",
    desc: "단산 모노레일과 짚라인까지 더하면 하루가 꽉 차는 문경 놀거리 코스가 완성됩니다.",
    tag: "함께 즐기기",
  },
];

const FAQS = [
  { q: "패러글라이딩은 처음인데 괜찮나요?", a: "네. 전문 파일럿이 함께 타는 2인승 체험비행이라 별도 기술 없이 10분 안팎의 지상 교육만 받으면 누구나 비행할 수 있습니다." },
  { q: "문경 여행 일정에 어떻게 넣으면 좋나요?", a: "오전 비행 후 문경새재·모노레일 코스, 또는 오전 관광 후 오후 비행을 추천합니다. 비행 자체는 준비부터 착륙까지 1시간 이내입니다." },
  { q: "예약은 어떻게 하나요?", a: `온라인 예약 페이지에서 날짜와 상품을 고르시거나, 전화(${COMPANY.phone})로 문의하시면 바로 안내해 드립니다.` },
];

export default async function MungyeongPage() {
  const [products, reviews] = await Promise.all([getActiveProducts(), getApprovedReviews(3)]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: C.bg, fontFamily: "var(--font-ibm-plex-sans), 'IBM Plex Sans', sans-serif" }}>
      <LandingNav />

      <LandingHero
        h1={<>문경 여행 가볼만한 곳,<br />하늘에서 즐기는 <span style={{ color: "#F54E00" }}>문경</span></>}
        sub={`문경 가볼만한 곳을 찾고 계신가요? 문경 액티비티의 하이라이트, 패러글라이딩 체험비행으로 문경 여행을 완성하세요. ${COMPANY.safetyRecord}.`}
      />

      {/* 문경 놀거리 코스 */}
      <section className="py-14 px-5" style={{ backgroundColor: C.bg }}>
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: C.accent }}>MUNGYEONG</p>
          <h2 className="font-bold mb-8" style={{ fontSize: "1.6rem", color: C.ink }}>문경 액티비티 · 놀거리 코스</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {ACTIVITIES.map((a) => (
              <div key={a.title} className="rounded-md p-5" style={{ border: `1px solid ${C.line}` }}>
                <span className="inline-block text-xs font-bold px-2 py-0.5 rounded-full mb-3" style={{ backgroundColor: C.bgAlt, color: C.sub }}>
                  {a.tag}
                </span>
                <p className="font-bold mb-2" style={{ color: C.ink }}>{a.title}</p>
                <p className="text-sm leading-relaxed" style={{ color: C.sub }}>{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PriceSection products={products} heading="문경 패러글라이딩 가격" />
      <ReviewSection reviews={reviews} />

      {/* FAQ */}
      <section className="py-14 px-5" style={{ backgroundColor: C.bgAlt }}>
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: C.accent }}>FAQ</p>
          <h2 className="font-bold mb-8" style={{ fontSize: "1.6rem", color: C.ink }}>자주 묻는 질문</h2>
          <div className="space-y-4">
            {FAQS.map((f) => (
              <div key={f.q} className="rounded-md p-5" style={{ backgroundColor: C.bg, border: `1px solid ${C.line}` }}>
                <p className="font-bold text-sm mb-2" style={{ color: C.ink }}>{f.q}</p>
                <p className="text-sm leading-relaxed" style={{ color: C.sub }}>{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CtaSection />
      <LandingFooter />
    </div>
  );
}
