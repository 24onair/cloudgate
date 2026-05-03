"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 min-h-screen flex flex-col" style={{ backgroundColor: "#0D2B52" }}>
      {/* 로고 */}
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Wind className="w-6 h-6" style={{ color: "#FF8A00" }} />
          <div>
            <p className="font-bold text-white text-base leading-tight">구름상회</p>
            <p className="text-xs" style={{ color: "#2A7AE2" }}>패러글라이딩 플랫폼</p>
          </div>
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

      {/* 하단 업체 정보 */}
      <div className="px-4 py-4 border-t border-white/10">
        <p className="text-xs text-white/40">단양 하늘체험 패러글라이딩</p>
        <p className="text-xs text-white/25 mt-0.5">관리자 계정</p>
      </div>
    </aside>
  );
}
