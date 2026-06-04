import Link from "next/link";
import { Markdown } from "@/components/Markdown";
import { LEGAL_RAW, type LegalDocKey } from "@/lib/legal/raw";
import { fillLegalTokens } from "@/lib/legal/fields";

const TITLES: Record<LegalDocKey, string> = {
  terms: "이용약관",
  privacy: "개인정보처리방침",
  refund: "취소·환불 정책",
};

const TABS: { key: LegalDocKey; href: string }[] = [
  { key: "terms", href: "/terms" },
  { key: "privacy", href: "/privacy" },
  { key: "refund", href: "/refund" },
];

export function LegalPage({ doc }: { doc: LegalDocKey }) {
  const content = fillLegalTokens(LEGAL_RAW[doc]);

  return (
    <div style={{ minHeight: "100vh", background: "#fdfdf8" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 20px 80px" }}>
        {/* 상단 네비 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <Link href="/" style={{ fontSize: 14, color: "#4d4f46", textDecoration: "none" }}>
            ← 구름상회 홈
          </Link>
        </div>

        {/* 문서 탭 */}
        <nav style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
          {TABS.map((t) => {
            const active = t.key === doc;
            return (
              <Link
                key={t.key}
                href={t.href}
                style={{
                  fontSize: 13,
                  padding: "6px 12px",
                  borderRadius: 999,
                  textDecoration: "none",
                  fontWeight: active ? 700 : 500,
                  color: active ? "#fff" : "#4d4f46",
                  background: active ? "#23251d" : "#eeefe9",
                  border: "1px solid rgba(35,37,29,0.1)",
                }}
              >
                {TITLES[t.key]}
              </Link>
            );
          })}
        </nav>

        {/* 본문 */}
        <article>
          <Markdown source={content} />
        </article>

        {/* 하단 안내 */}
        <p style={{ marginTop: 40, fontSize: 12, color: "#9ea096", lineHeight: 1.7 }}>
          본 문서는 표준 약관 및 KISA 표준안을 기반으로 작성되었습니다. 문의:
          문경패러글라이딩(주) · 고객센터 1688-6707
        </p>
      </div>
    </div>
  );
}
