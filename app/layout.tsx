import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import { COMPANY } from "@/lib/company";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL?.startsWith("https")
  ? process.env.NEXT_PUBLIC_APP_URL
  : COMPANY.siteUrl;

// 네이버 서치어드바이저 소유 확인 코드 — 발급 후 env 또는 여기에 입력
const NAVER_VERIFICATION = process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION ?? "";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `문경 패러글라이딩 체험비행 | ${COMPANY.name}`,
    template: `%s | ${COMPANY.name}`,
  },
  description: `${COMPANY.safetyRecord}, 문경 패러글라이딩 체험비행. 전문 파일럿과 함께 초보자도 10분이면 하늘을 날 수 있습니다. 전화 ${COMPANY.phone}`,
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: `${COMPANY.brand} — ${COMPANY.name}`,
    title: `문경 패러글라이딩 체험비행 | ${COMPANY.name}`,
    description: `${COMPANY.safetyRecord}, 문경 패러글라이딩 체험비행 예약`,
    url: SITE_URL,
  },
  robots: { index: true, follow: true },
  ...(NAVER_VERIFICATION
    ? { verification: { other: { "naver-site-verification": NAVER_VERIFICATION } } }
    : {}),
};

// LocalBusiness 구조화 데이터 — 지역 업체 검색 노출용
const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: COMPANY.name,
  alternateName: COMPANY.brand,
  telephone: "+82-1688-6707",
  url: SITE_URL,
  address: {
    "@type": "PostalAddress",
    addressCountry: "KR",
    addressRegion: "경상북도",
    addressLocality: "문경시",
    streetAddress: "산북면 석봉길 424-71",
  },
  areaServed: "문경",
  description: `${COMPANY.safetyRecord} — 문경 패러글라이딩 체험비행`,
};

const SUPABASE_ORIGIN = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {
    return null;
  }
})();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${ibmPlexSans.variable} h-full antialiased`}>
      <head>
        {SUPABASE_ORIGIN && <link rel="preconnect" href={SUPABASE_ORIGIN} />}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
