"use client";

// 인증 보호는 middleware.ts (gureum_pilot_session 쿠키 검증)가 담당
// 이 layout은 UI 래퍼만 제공
export default function PilotLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#eeefe9" }}>
      {children}
    </div>
  );
}
