// 광고그룹 C(전국) 랜딩 — 키워드: 패러글라이딩체험·패러글라이딩추천
// "왜 문경인가"를 서버 렌더로 제시. 서브링크 "오시는길" 타깃(#access) 포함.
import type { Metadata } from "next";
import { MapPin, Phone } from "lucide-react";
import { COMPANY } from "@/lib/company";
import { getActiveProducts } from "@/lib/landing/queries";
import {
  C,
  LandingNav,
  LandingHero,
  PriceSection,
  CtaSection,
  LandingFooter,
} from "@/components/landing/AdLandingParts";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "패러글라이딩 체험 추천, 왜 문경인가",
  description: `전국 패러글라이딩 체험 명소 비교 중이라면 문경입니다. ${COMPANY.safetyRecord}, 안정적인 기류의 문경활공장, 수도권 2시간. 전화 ${COMPANY.phone}`,
};

const REASONS = [
  {
    title: "28년 무사고 운항",
    desc: "패러글라이딩 체험에서 가장 중요한 것은 안전입니다. 문경패러글라이딩(주)는 28년 무사고 운항 기록을 이어오고 있으며, 모든 비행에 유자격 전문 파일럿이 동승합니다.",
  },
  {
    title: "비행에 유리한 문경활공장",
    desc: "문경활공장은 산세와 기류 조건이 안정적이어서 전국 파일럿들이 찾는 활공 명소입니다. 그만큼 비행 가능 일수가 많아 예약한 날 실제로 비행할 확률이 높습니다.",
  },
  {
    title: "어디서든 가까운 접근성",
    desc: "중부내륙고속도로로 수도권에서 약 2시간. 대구·대전·부산 등 영남·충청권에서도 당일치기로 다녀올 수 있는 위치입니다.",
  },
  {
    title: "초보자 중심 운영",
    desc: "탑승객의 대부분이 생애 첫 비행입니다. 지상 교육부터 착륙까지 초보자 기준으로 설계된 진행으로, 10분 교육 후 바로 비행할 수 있습니다.",
  },
];

export default async function WhyMungyeongPage() {
  const products = await getActiveProducts();

  return (
    <div className="min-h-screen" style={{ backgroundColor: C.bg, fontFamily: "var(--font-ibm-plex-sans), 'IBM Plex Sans', sans-serif" }}>
      <LandingNav />

      <LandingHero
        h1={<>패러글라이딩 체험,<br />왜 <span style={{ color: "#F54E00" }}>문경</span>인가</>}
        sub={`전국 패러글라이딩 명소를 비교하고 계신가요? 패러글라이딩 체험 추천 1순위, 문경이어야 하는 이유를 확인하세요.`}
      />

      {/* 근거 */}
      <section className="py-14 px-5" style={{ backgroundColor: C.bg }}>
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: C.accent }}>WHY MUNGYEONG</p>
          <h2 className="font-bold mb-8" style={{ fontSize: "1.6rem", color: C.ink }}>문경을 선택하는 4가지 이유</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {REASONS.map((r, i) => (
              <div key={r.title} className="rounded-md p-6" style={{ border: `1px solid ${C.line}` }}>
                <p className="font-bold text-2xl mb-2" style={{ color: C.accent }}>{String(i + 1).padStart(2, "0")}</p>
                <p className="font-bold mb-2" style={{ color: C.ink }}>{r.title}</p>
                <p className="text-sm leading-relaxed" style={{ color: C.sub }}>{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 오시는 길 — 광고 서브링크 타깃 */}
      <section id="access" className="py-14 px-5" style={{ backgroundColor: C.bgAlt }}>
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: C.accent }}>ACCESS</p>
          <h2 className="font-bold mb-6" style={{ fontSize: "1.6rem", color: C.ink }}>오시는 길</h2>
          <div className="rounded-md p-6 space-y-3" style={{ backgroundColor: C.bg, border: `1px solid ${C.line}` }}>
            <p className="flex items-start gap-2 text-sm" style={{ color: C.ink }}>
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: C.accent }} />
              <span><strong>사무실·착륙장</strong> — {COMPANY.address}</span>
            </p>
            <p className="flex items-start gap-2 text-sm" style={{ color: C.ink }}>
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: C.accent }} />
              <span><strong>이륙장</strong> — {COMPANY.launchSite}</span>
            </p>
            <p className="flex items-start gap-2 text-sm" style={{ color: C.ink }}>
              <Phone className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: C.accent }} />
              <a href={COMPANY.telHref} style={{ color: C.ink }}><strong>{COMPANY.phone}</strong> — 길 안내가 필요하시면 전화 주세요</a>
            </p>
            <a
              href={`https://map.naver.com/p/search/${encodeURIComponent(COMPANY.name)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-block mt-2 px-4 py-2.5 rounded-md text-sm font-bold text-white"
              style={{ backgroundColor: "#03C75A" }}
            >
              네이버 지도로 보기
            </a>
          </div>
        </div>
      </section>

      <PriceSection products={products} heading="문경 패러글라이딩 체험 가격" />
      <CtaSection />
      <LandingFooter />
    </div>
  );
}
