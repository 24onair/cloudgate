import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "취소·환불 정책 | 구름상회",
  description: "구름상회 패러글라이딩 체험비행 취소·환불 정책",
};

export default function RefundPage() {
  return <LegalPage doc="refund" />;
}
