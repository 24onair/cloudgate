/**
 * 법적 문서(이용약관·개인정보·환불정책)의 가변 항목 단일 출처.
 *
 * LEGAL_DRAFTS 원문에 남아 있던 빈칸을 여기서 한 번에 채운다.
 * 값이 정해지면 이 파일만 수정하면 3개 페이지에 동시 반영된다.
 *
 * ⚠️ 아직 확정 안 된 값(이메일·통신판매업 신고번호·최대 연령·카카오 채널)은
 *    UNSET 으로 두었고, 페이지에는 "(추후 안내)"로 표기된다. 사장님 확인 후 교체할 것.
 */

const UNSET = "(추후 안내)";

export interface LegalFields {
  /** 시행일/최종 개정일 (YYYY-MM-DD) */
  effectiveDate: string;
  /** 부칙 표기용 (YYYY년 M월 D일) */
  effectiveDateKo: string;
  /** 고객센터 이메일 — PG 가맹·개인정보 문의 창구 (필수, 미확정) */
  email: string;
  /** 통신판매업 신고번호 (필수, 미확정 — 정부24 조회) */
  mailOrderNo: string;
  /** 최대 탑승 연령 (만 N세 이하) — 안전 기준 (미확정) */
  maxAge: string;
  /** 최소 탑승 체중 (Nkg 이상) — 예약 화면 고지(40~90kg)와 일치시켜 40 사용 */
  minWeight: string;
  /** 최대 탑승 체중 (Nkg 이하) — 예약 화면 고지(40~90kg)와 일치시켜 90 사용 */
  maxWeight: string;
  /** 카카오톡 채널명 (미운영이면 UNSET) */
  kakao: string;
}

export const LEGAL_FIELDS: LegalFields = {
  effectiveDate: "2026-06-02", // TODO: 사장님 확정 시행일로 교체
  effectiveDateKo: "2026년 6월 2일", // TODO: effectiveDate 와 동기화
  email: UNSET, // TODO 필수: 고객센터 이메일
  mailOrderNo: UNSET, // TODO 필수: 통신판매업 신고번호
  maxAge: UNSET, // TODO: 최대 연령 (예: 만 70세)
  minWeight: "40", // 예약 화면 "체중 40kg~90kg" 고지와 일치 (원문 15kg 하한은 오기)
  maxWeight: "90", // 예약 화면 "체중 40kg~90kg" 고지와 일치
  kakao: UNSET, // TODO: 카카오 채널명 또는 미운영
};

/** 원문 마크다운의 빈칸 토큰을 실제 값으로 치환한다. */
export function fillLegalTokens(md: string, f: LegalFields = LEGAL_FIELDS): string {
  return md
    .replaceAll("2026-[ ]-[ ]", f.effectiveDate)
    .replaceAll("2026년 [ ]월 [ ]일", f.effectiveDateKo)
    .replaceAll("[이메일 — 추후 입력]", f.email)
    .replaceAll("[통신판매업 신고번호 — 추후 입력]", f.mailOrderNo)
    .replaceAll("[최대연령 — 추후 입력]", f.maxAge)
    .replaceAll("체중: 15kg", `체중: ${f.minWeight}kg`) // 원문 하한 15kg → 예약 화면 기준(40kg)으로 통일
    .replaceAll("[최대체중 — 추후 입력]", f.maxWeight)
    .replaceAll("[카카오 채널명 — 추후 입력 또는 미운영]", f.kakao)
    .replaceAll("[알림 서비스 제공자: 추후 결정]", "알림 서비스 제공자(선정 예정)");
}
