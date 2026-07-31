/**
 * 회사 정보 단일 출처.
 *
 * 서버 HTML에 박혀야 하는 값(tel: 링크·JSON-LD·metadata)은 DB(footerStore)가
 * 아니라 이 상수를 쓴다. footerStore는 클라이언트 fetch 의존 + 기본값이 더미라
 * 크롤러·초기 페인트에 안전하지 않다. 푸터 표시용 DB값은 별도 유지.
 */
export const COMPANY = {
  /** 법인명 (광고·약관 표기) */
  name: "문경패러글라이딩(주)",
  /** 서비스 브랜드 */
  brand: "구름상회",
  /** 대표번호 */
  phone: "1688-6707",
  /** 전화 링크 href */
  telHref: "tel:1688-6707",
  /** 사업장 주소 */
  address: "경상북도 문경시 산북면 석봉길 424-71",
  /** 이륙장 */
  launchSite: "경상북도 문경시 산북면 당포리 산70 (문경활공장)",
  /** 대표 도메인 (metadataBase 폴백) */
  siteUrl: "https://www.mgpara.com",
  /** 안전 실적 — 광고 소재와 문구 일치 필수 (사실 확인됨) */
  safetyRecord: "28년 무사고 운항",
} as const;
