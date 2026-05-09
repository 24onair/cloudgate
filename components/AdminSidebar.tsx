"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLogo } from "@/lib/logoStore";
import { useFooter } from "@/lib/footerStore";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Wind,
  CheckCircle,
  BarChart2,
  Bell,
  Calculator,
  CloudSun,
  PlusCircle,
  Package,
  Clock,
  Share2,
  Settings,
  Sliders,
  MessageSquare,
  LogOut,
} from "lucide-react";

const menuItems = [
  {
    label: "오늘의 구름상회",
    sublabel: "대시보드",
    icon: LayoutDashboard,
    href: "/admin",
  },
  {
    label: "예약대장",
    sublabel: "예약관리",
    icon: BookOpen,
    href: "/admin/bookings",
  },
  {
    label: "상품관리",
    sublabel: "상품·옵션",
    icon: Package,
    href: "/admin/products",
  },
  {
    label: "파일럿장",
    sublabel: "배정관리",
    icon: Users,
    href: "/admin/pilots",
  },
  {
    label: "예약슬롯",
    sublabel: "시간·정원",
    icon: Clock,
    href: "/admin/slots",
  },
  {
    label: "바람판",
    sublabel: "날씨",
    icon: CloudSun,
    href: "/admin/weather",
  },
  {
    label: "착륙완료",
    sublabel: "비행 처리",
    icon: CheckCircle,
    href: "/admin/ops",
  },
  {
    label: "계산대",
    sublabel: "정산관리",
    icon: Calculator,
    href: "/admin/settlement",
  },
  {
    label: "장사리포트",
    sublabel: "매출분석",
    icon: BarChart2,
    href: "/admin/finance",
  },
  {
    label: "호출",
    sublabel: "알림",
    icon: Bell,
    href: "/admin/notifications",
  },
  {
    label: "SNS관리",
    sublabel: "인스타·유튜브",
    icon: Share2,
    href: "/admin/sns",
  },
  {
    label: "후기관리",
    sublabel: "승인·게시",
    icon: MessageSquare,
    href: "/admin/reviews",
  },
  {
    label: "사이트셋업",
    sublabel: "브랜드·랜딩",
    icon: Sliders,
    href: "/admin/setup",
  },
  {
    label: "사이트설정",
    sublabel: "배경·외관",
    icon: Settings,
    href: "/admin/settings",
  },
];

export default function AdminSidebar() {
  const router = useRouter();
  const logo = useLogo();
  const footer = useFooter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
  }
  const pathname = usePathname();

  const showText = !logo.imageDataUrl || logo.showText;
  const siteText = logo.text || "구름상회";

  return (
    <aside className="w-60 min-h-screen flex flex-col" style={{ backgroundColor: "#0D2B52" }}>
      {/* 로고 */}
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          {logo.imageDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo.imageDataUrl}
              alt="로고"
              className="h-7 w-auto object-contain"
              style={{ filter: "brightness(0) invert(1)" }}
            />
          ) : (
            <Wind className="w-6 h-6" style={{ color: "#FF8A00" }} />
          )}
          {showText && (
            <div>
              <p className="font-bold text-white text-base leading-tight">{siteText}</p>
              <p className="text-xs" style={{ color: "#2A7AE2" }}>패러글라이딩 플랫폼</p>
            </div>
          )}
        </div>
      </div>

      {/* 새 예약 버튼 */}
      <div className="px-4 pt-4 pb-2">
        <Link
          href="/admin/bookings/new"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-colors"
          style={{ backgroundColor: "#2A7AE2" }}
        >
          <PlusCircle className="w-4 h-4" />
          새 예약 입력
        </Link>
      </div>

      {/* 메뉴 */}
      <nav className="flex-1 px-3 py-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 transition-colors group ${
                isActive
                  ? "text-white"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
              style={isActive ? { backgroundColor: "rgba(42,122,226,0.25)" } : {}}
            >
              <Icon
                className="w-4 h-4 flex-shrink-0"
                style={{ color: isActive ? "#FF8A00" : undefined }}
              />
              <div>
                <p className="text-sm font-medium leading-tight">{item.label}</p>
                <p className="text-xs text-white/40">{item.sublabel}</p>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* 하단 업체 정보 + 로그아웃 */}
      <div className="px-4 py-4 border-t border-white/10">
        <p className="text-xs text-white/40">{footer.bizName || "단양 하늘체험 패러글라이딩"}</p>
        <p className="text-xs text-white/25 mt-0.5">관리자 계정</p>
        <button
          onClick={handleLogout}
          className="mt-3 flex items-center gap-2 text-xs text-white/40 hover:text-white/70 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          로그아웃
        </button>
      </div>
    </aside>
  );
}
