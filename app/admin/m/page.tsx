"use client";

/**
 * 모바일 어드민 홈 — 전화 응대용 단축 진입점.
 *
 * 3초 안에 다음 두 가지를 판단·실행할 수 있어야 한다:
 *  1. 지금 전화 받았다 → "전화 예약 받기" 큰 버튼
 *  2. 오늘 배정 어떻게 됐지? → "오늘 배정 확인" 버튼 (pending_admin_review 빨간 뱃지)
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PhoneIncoming,
  ListChecks,
  CalendarDays,
  LogOut,
  AlertTriangle,
  RefreshCw,
  Wind,
} from "lucide-react";
import { useLogo } from "@/lib/logoStore";

interface BookingRow {
  id: string;
  status: string;
  assignment_status: string | null;
}

interface DaySummary {
  total: number;
  pending: number; // pending_admin_review
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function tomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatKoDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getMonth() + 1}/${d.getDate()} (${days[d.getDay()]})`;
}

export default function AdminMobileHomePage() {
  const logo = useLogo();
  const showText = !logo.imageDataUrl || logo.showText;
  const siteText = logo.text || "구름상회";

  const [today, setToday] = useState<DaySummary>({ total: 0, pending: 0 });
  const [tomorrow, setTomorrow] = useState<DaySummary>({ total: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const todayStr = todayISO();
  const tomorrowStr = tomorrowISO();

  async function load() {
    try {
      const [todayRes, tmrwRes] = await Promise.all([
        fetch(`/api/bookings?date=${todayStr}`, { cache: "no-store" }),
        fetch(`/api/bookings?date=${tomorrowStr}`, { cache: "no-store" }),
      ]);
      const todayJson = todayRes.ok ? await todayRes.json() : [];
      const tmrwJson = tmrwRes.ok ? await tmrwRes.json() : [];
      const summarize = (rows: unknown): DaySummary => {
        const list: BookingRow[] = Array.isArray(rows) ? (rows as BookingRow[]) : [];
        const filtered = list.filter((b) => b.status !== "cancelled");
        const pending = filtered.filter((b) => b.assignment_status === "pending_admin_review").length;
        return { total: filtered.length, pending };
      };
      setToday(summarize(todayJson));
      setTomorrow(summarize(tmrwJson));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
    // 5분마다 자동 새로고침
    const tid = setInterval(() => load(), 5 * 60 * 1000);
    return () => clearInterval(tid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  return (
    <div className="flex flex-col w-full flex-1">
      {/* 상단 헤더 — 사이트 세팅의 로고/텍스트 사용 + 오늘 날짜 + 새로고침 */}
      <header className="px-5 pt-4 pb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {logo.imageDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo.imageDataUrl}
              alt="로고"
              className="h-9 w-auto object-contain shrink-0"
            />
          ) : (
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: "#0D2B52" }}
            >
              <Wind size={20} style={{ color: "#FF8A00" }} />
            </div>
          )}
          <div className="min-w-0">
            {showText && (
              <div
                className="text-base font-bold leading-tight truncate"
                style={{ color: "#0D2B52" }}
              >
                {siteText}
              </div>
            )}
            <div
              className="text-xs mt-0.5 font-medium"
              style={{ color: "#65675e" }}
            >
              {formatKoDate(todayStr)} 오늘
            </div>
          </div>
        </div>
        <button
          type="button"
          aria-label="새로고침"
          onClick={() => {
            setRefreshing(true);
            load();
          }}
          className="w-11 h-11 rounded-full flex items-center justify-center bg-white shadow-sm active:scale-95 transition shrink-0"
        >
          <RefreshCw
            size={20}
            className={refreshing ? "animate-spin" : ""}
            style={{ color: "#0D2B52" }}
          />
        </button>
      </header>

      {/* 오늘 요약 카드 */}
      <section className="px-5">
        <div className="rounded-2xl bg-white shadow-sm p-5">
          <div className="flex items-baseline justify-between">
            <div className="text-sm font-medium" style={{ color: "#65675e" }}>
              오늘 예약
            </div>
            <div className="text-xs" style={{ color: "#9ea096" }}>
              5분마다 자동 갱신
            </div>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <div className="text-4xl font-extrabold" style={{ color: "#0D2B52" }}>
              {loading ? "—" : today.total}
            </div>
            <div className="text-base font-medium" style={{ color: "#4d4f46" }}>
              건
            </div>
          </div>
          {today.pending > 0 ? (
            <div
              className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2"
              style={{ backgroundColor: "#FEF2F2" }}
            >
              <AlertTriangle size={16} style={{ color: "#B91C1C" }} />
              <span className="text-sm font-semibold" style={{ color: "#B91C1C" }}>
                수동 배정 필요 {today.pending}건
              </span>
            </div>
          ) : !loading ? (
            <div
              className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2"
              style={{ backgroundColor: "#ECFDF5" }}
            >
              <span className="text-sm font-semibold" style={{ color: "#047857" }}>
                ✓ 모든 예약 자동 배정 완료
              </span>
            </div>
          ) : null}
        </div>
      </section>

      {/* CTA 버튼들 */}
      <section className="px-5 mt-5 space-y-3">
        <Link
          href="/admin/m/new"
          className="block w-full rounded-2xl px-5 active:scale-[0.99] transition shadow-sm"
          style={{ backgroundColor: "#0D2B52", color: "white", minHeight: 72 }}
        >
          <div className="flex items-center gap-4 h-full py-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
            >
              <PhoneIncoming size={26} />
            </div>
            <div className="flex-1 text-left">
              <div className="text-lg font-bold">전화 예약 받기</div>
              <div className="text-xs opacity-80 mt-0.5">고객 통화 중 즉시 입력 · 자동 배정</div>
            </div>
            <span className="text-2xl opacity-70">›</span>
          </div>
        </Link>

        <Link
          href="/admin/m/today"
          className="block w-full rounded-2xl px-5 active:scale-[0.99] transition shadow-sm bg-white"
          style={{ minHeight: 64 }}
        >
          <div className="flex items-center gap-4 h-full py-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: "#EFF6FF" }}
            >
              <ListChecks size={24} style={{ color: "#2A7AE2" }} />
            </div>
            <div className="flex-1 text-left">
              <div className="text-base font-bold" style={{ color: "#0D2B52" }}>
                오늘 배정 확인
              </div>
              <div className="text-xs mt-0.5" style={{ color: "#65675e" }}>
                {loading ? "불러오는 중…" : `${today.total}건 · 파일럿 배정 현황`}
              </div>
            </div>
            {today.pending > 0 ? (
              <span
                className="px-2 py-1 rounded-full text-xs font-bold"
                style={{ backgroundColor: "#FEE2E2", color: "#B91C1C" }}
              >
                {today.pending}
              </span>
            ) : (
              <span className="text-xl" style={{ color: "#9ea096" }}>›</span>
            )}
          </div>
        </Link>

        <Link
          href={`/admin/m/today?date=${tomorrowStr}`}
          className="block w-full rounded-2xl px-5 active:scale-[0.99] transition shadow-sm bg-white"
          style={{ minHeight: 64 }}
        >
          <div className="flex items-center gap-4 h-full py-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: "#FFF7ED" }}
            >
              <CalendarDays size={24} style={{ color: "#F97316" }} />
            </div>
            <div className="flex-1 text-left">
              <div className="text-base font-bold" style={{ color: "#0D2B52" }}>
                내일 예약
              </div>
              <div className="text-xs mt-0.5" style={{ color: "#65675e" }}>
                {loading
                  ? "불러오는 중…"
                  : `${formatKoDate(tomorrowStr)} · ${tomorrow.total}건`}
              </div>
            </div>
            <span className="text-xl" style={{ color: "#9ea096" }}>›</span>
          </div>
        </Link>
      </section>

      {/* 하단 여백 + 로그아웃 */}
      <div className="flex-1" />
      <footer className="px-5 pb-6 pt-8 flex items-center justify-end">
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs"
          style={{ color: "#65675e" }}
        >
          <LogOut size={14} />
          로그아웃
        </button>
      </footer>
    </div>
  );
}
