import { cookies, headers } from "next/headers";
import AdminSidebar from "@/components/AdminSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const session = cookieStore.get("gureum_admin_session");

  // 세션이 없으면 sidebar 없이 렌더링 (로그인 페이지)
  if (!session?.value) {
    return <>{children}</>;
  }

  // 모바일 어드민(/admin/m/*) 경로는 데스크탑 사이드바를 건너뛰고
  // 자식 레이아웃(app/admin/m/layout.tsx)이 모바일 전용 골격을 그리도록 위임.
  // proxy.ts가 x-pathname 헤더를 주입한다.
  const hdrs = await headers();
  const pathname = hdrs.get("x-pathname") ?? "";
  if (pathname === "/admin/m" || pathname.startsWith("/admin/m/")) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "#F5F7FA" }}>
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
