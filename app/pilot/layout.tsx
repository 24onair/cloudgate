"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function PilotLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 로그인 페이지는 인증 불필요
    if (pathname === "/pilot/login") return;

    // localStorage에 pilot_id가 없으면 로그인 페이지로
    const pilotId = localStorage.getItem("gureum_pilot_id");
    if (!pilotId) {
      router.replace("/pilot/login");
    }
  }, [pathname, router]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#eeefe9" }}>
      {children}
    </div>
  );
}
