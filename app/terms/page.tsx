import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "이용약관 | 구름상회",
  description: "구름상회 패러글라이딩 체험비행 예약 서비스 이용약관",
};

export default function TermsPage() {
  return <LegalPage doc="terms" />;
}
