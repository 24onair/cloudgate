import type { Metadata } from "next";
import { COMPANY } from "@/lib/company";

// 광고그룹 A(전환: 문경패러글라이딩예약·가격 키워드)의 랜딩.
// title 은 루트 template 적용 → "문경 패러글라이딩 예약 | 문경패러글라이딩(주)"
export const metadata: Metadata = {
  title: "문경 패러글라이딩 예약",
  description: `문경 패러글라이딩 가격·일정 확인 후 바로 예약. ${COMPANY.safetyRecord}. 전화 예약 ${COMPANY.phone}`,
};

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
