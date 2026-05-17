import type { Viewport } from "next";

/**
 * 모바일 어드민 전용 레이아웃.
 * - 데스크탑 사이드바 없음 (부모 app/admin/layout.tsx가 /admin/m/* 경로에서 사이드바를 건너뜀)
 * - viewport meta: user-scalable=no는 막지 않음 (접근성 — 시력 약한 운영자 대응)
 * - 본문은 safe-area-inset-top/bottom 패딩으로 iOS 노치/홈바 회피
 * - 전체 폭은 모바일 가정(max-w-md), 데스크탑에서 접속해도 깨지지 않도록 중앙 정렬
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0D2B52",
  viewportFit: "cover",
};

export default function AdminMobileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen w-full mx-auto max-w-md flex flex-col"
      style={{
        backgroundColor: "#F5F7FA",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {children}
    </div>
  );
}
