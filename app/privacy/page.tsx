import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "개인정보처리방침 | 구름상회",
  description: "구름상회 개인정보처리방침",
};

export default function PrivacyPage() {
  return <LegalPage doc="privacy" />;
}
