"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Wind,
  CalendarDays,
  BookOpen,
  Calculator,
  CheckCircle2,
  Clock,
  CloudSun,
  AlertTriangle,
  ChevronRight,
  User,
  Package,
  Plane,
  TrendingUp,
  LayoutGrid,
} from "lucide-react";

// ─── Mock Data ────────────────────────────────────────────────────────────────

const PILOT = {
  id: "P003",
  name: "박구름",
  license_expiry: "2027-03-15",
  total_flights_all: 1248,
};

type FlightStatus = "waiting" | "flying" | "landed" | "completed";

interface Flight {
  booking_id: string;
  time_slot: string;
  customer_name: string;
  headcount: number;
  product_name: string;
  options: string[];
  status: FlightStatus;
  landed_at?: string;
}

const TODAY_FLIGHTS_INIT: Flight[] = [
  {
    booking_id: "BK-20260501-1021",
    time_slot: "09:00",
    customer_name: "이수진",
    headcount: 1,
    product_name: "베이직",
    options: [],
    status: "completed",
    landed_at: "09:14",
  },
  {
    booking_id: "BK-20260501-1045",
    time_slot: "10:30",
    customer_name: "최현우",
    headcount: 1,
    product_name: "베이직",
    options: ["사진 패키지"],
    status: "completed",
    landed_at: "10:43",
  },
  {
    booking_id: "BK-20260501-9970",
    time_slot: "13:00",
    customer_name: "김민준",
    headcount: 1,
    product_name: "베이직",
    options: ["사진 패키지"],
    status: "flying",
  },
  {
    booking_id: "BK-20260501-2201",
    time_slot: "15:00",
    customer_name: "박지연",
    headcount: 2,
    product_name: "VIP",
    options: ["사진+영상 풀 패키지"],
    status: "waiting",
  },
  {
    booking_id: "BK-20260501-3312",
    time_slot: "16:30",
    customer_name: "정성민",
    headcount: 1,
    product_name: "익스트림",
    options: [],
    status: "waiting",
  },
];

const FLIGHT_HISTORY = [
  { date: "2026-04-28", day: "월", count: 5, amount: 75000 },
  { date: "2026-04-29", day: "화", count: 8, amount: 120000 },
  { date: "2026-04-30", day: "수", count: 3, amount: 45000 },
  { date: "2026-05-01", day: "목", count: 3, amount: 45000 },
];

const SETTLEMENT = {
  period: "2026-04-28 ~ 2026-05-04",
  status: "draft" as const,
  rate: 15000,
  days: [
    { date: "2026-04-28", day: "월", count: 5, subtotal: 75000 },
    { date: "2026-04-29", day: "화", count: 8, subtotal: 120000 },
    { date: "2026-04-30", day: "수", count: 3, subtotal: 45000 },
    { date: "2026-05-01", day: "목", count: 3, subtotal: 45000 },
    { date: "2026-05-02", day: "금", count: 0, subtotal: 0 },
    { date: "2026-05-03", day: "토", count: 0, subtotal: 0 },
    { date: "2026-05-04", day: "일", count: 0, subtotal: 0 },
  ],
  total_flights: 19,
  total_amount: 285000,
  payment_due: "2026-05-10",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

function statusConfig(status: FlightStatus) {
  switch (status) {
    case "waiting":
      return { label: "대기 중", bg: "#F5F7FA", text: "#6B7280", border: "#E5E7EB", dot: "#9CA3AF" };
    case "flying":
      return { label: "비행 중", bg: "#FFF7ED", text: "#C2410C", border: "#FED7AA", dot: "#FF8A00" };
    case "landed":
      return { label: "착륙 완료", bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE", dot: "#2A7AE2" };
    case "completed":
      return { label: "완료", bg: "#F0FDF4", text: "#15803D", border: "#BBF7D0", dot: "#22C55E" };
  }
}

type Tab = "today" | "history" | "settlement";

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PilotPortalPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("today");
  const [flights, setFlights] = useState<Flight[]>(TODAY_FLIGHTS_INIT);
  const [landingFlight, setLandingFlight] = useState<string | null>(null);

  const completedCount = flights.filter((f) => f.status === "completed" || f.status === "landed").length;
  const totalCount = flights.length;
  const flyingNow = flights.find((f) => f.status === "flying");

  function handleLand(bookingId: string) {
    setLandingFlight(bookingId);
    setTimeout(() => {
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      setFlights((prev) =>
        prev.map((f) =>
          f.booking_id === bookingId ? { ...f, status: "completed", landed_at: hhmm } : f
        )
      );
      setLandingFlight(null);
    }, 900);
  }

  // ── Header ──────────────────────────────────────────────────────────────────
  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric", month: "long", day: "numeric", weekday: "short",
  });

  // ── Today Tab ───────────────────────────────────────────────────────────────

  const TodayTab = () => (
    <div>
      {/* 날씨 배지 */}
      <div
        className="flex items-center gap-3 rounded-2xl px-5 py-4 mb-5"
        style={{ backgroundColor: "#F0FDF4", border: "1.5px solid #BBF7D0" }}
      >
        <CloudSun className="w-5 h-5" style={{ color: "#16A34A" }} />
        <div>
          <p className="text-sm font-bold text-green-800">🟢 비행하기 좋은 날씨</p>
          <p className="text-xs text-green-600">맑음 · 풍속 2.8m/s · 가시거리 최상</p>
        </div>
      </div>

      {/* 진행 현황 */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "오늘 총 배정", value: totalCount, sub: "건", color: "#0D2B52" },
          { label: "완료", value: completedCount, sub: "건", color: "#16A34A" },
          { label: "남은 비행", value: totalCount - completedCount, sub: "건", color: "#FF8A00" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}<span className="text-base font-normal text-gray-400 ml-0.5">{stat.sub}</span></p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* 현재 비행 중 배너 */}
      {flyingNow && (
        <div
          className="rounded-2xl px-5 py-4 mb-5 flex items-center justify-between"
          style={{ backgroundColor: "#FFF7ED", border: "2px solid #FED7AA" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: "#FF8A00" }} />
            <div>
              <p className="text-sm font-bold text-orange-800">현재 비행 중</p>
              <p className="text-xs text-orange-600">{flyingNow.customer_name} · {flyingNow.product_name} · {flyingNow.time_slot} 출발</p>
            </div>
          </div>
          <button
            onClick={() => handleLand(flyingNow.booking_id)}
            disabled={landingFlight === flyingNow.booking_id}
            className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
            style={{ backgroundColor: "#FF8A00" }}
          >
            {landingFlight === flyingNow.booking_id ? "처리 중..." : "착륙 완료"}
          </button>
        </div>
      )}

      {/* 비행 목록 */}
      <div className="space-y-3">
        {flights.map((flight) => {
          const cfg = statusConfig(flight.status);
          const isFlying = flight.status === "flying";
          const isWaiting = flight.status === "waiting";
          return (
            <div
              key={flight.booking_id}
              className="bg-white rounded-2xl p-5 shadow-sm"
              style={{
                border: isFlying ? "2px solid #FED7AA" : "1.5px solid #F3F4F6",
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="text-center w-14">
                    <p className="text-xl font-bold" style={{ color: "#0D2B52" }}>{flight.time_slot}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-bold text-gray-900">{flight.customer_name}</p>
                      {flight.headcount > 1 && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: "#FF8A00" }}>
                          {flight.headcount}인
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{flight.product_name}
                      {flight.options.length > 0 && (
                        <span className="text-gray-400"> · {flight.options.join(", ")}</span>
                      )}
                    </p>
                  </div>
                </div>
                <span
                  className="text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1"
                  style={{ backgroundColor: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.dot }} />
                  {cfg.label}
                </span>
              </div>

              {/* 완료 정보 */}
              {(flight.status === "completed" || flight.status === "landed") && flight.landed_at && (
                <div className="flex items-center gap-1.5 text-xs text-green-600 mt-2">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>착륙 {flight.landed_at} · 예약번호 {flight.booking_id}</span>
                </div>
              )}

              {/* 액션 버튼 */}
              {isWaiting && (
                <button
                  onClick={() => setFlights((prev) =>
                    prev.map((f) => f.booking_id === flight.booking_id ? { ...f, status: "flying" } : f)
                  )}
                  className="mt-3 w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                  style={{ backgroundColor: "#2A7AE2" }}
                >
                  비행 시작
                </button>
              )}
              {isFlying && (
                <button
                  onClick={() => handleLand(flight.booking_id)}
                  disabled={landingFlight === flight.booking_id}
                  className="mt-3 w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
                  style={{ backgroundColor: "#FF8A00" }}
                >
                  {landingFlight === flight.booking_id ? "처리 중..." : "착륙 완료 처리"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── History Tab ─────────────────────────────────────────────────────────────

  const HistoryTab = () => {
    const totalThisWeek = FLIGHT_HISTORY.reduce((s, d) => s + d.count, 0);
    return (
      <div>
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="font-bold text-gray-900">이번 주 비행기록</p>
            <p className="text-sm text-gray-400">2026-04-28 ~ 2026-05-04</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold" style={{ color: "#0D2B52" }}>{totalThisWeek}<span className="text-base font-normal text-gray-400 ml-0.5">건</span></p>
            <p className="text-xs text-gray-400">누적 {PILOT.total_flights_all.toLocaleString()}건</p>
          </div>
        </div>

        {/* 주간 막대 차트 느낌 */}
        <div className="bg-white rounded-2xl p-5 mb-5 shadow-sm">
          <div className="flex items-end gap-2 h-28">
            {FLIGHT_HISTORY.map((d) => {
              const maxCount = Math.max(...FLIGHT_HISTORY.map((x) => x.count));
              const heightPct = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
              const isToday = d.date === new Date().toISOString().split("T")[0];
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-bold text-gray-700">{d.count}</span>
                  <div className="w-full rounded-t-lg transition-all" style={{
                    height: `${Math.max(heightPct, 8)}%`,
                    backgroundColor: isToday ? "#FF8A00" : "#2A7AE2",
                    opacity: d.count === 0 ? 0.2 : 1,
                  }} />
                  <span className="text-xs text-gray-400">{d.day}</span>
                </div>
              );
            })}
            {/* 빈 날 */}
            {["금", "토", "일"].map((day) => (
              <div key={day} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-bold text-gray-300">0</span>
                <div className="w-full rounded-t-lg" style={{ height: "8%", backgroundColor: "#E5E7EB" }} />
                <span className="text-xs text-gray-300">{day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 날짜별 상세 */}
        <div className="space-y-2">
          {FLIGHT_HISTORY.map((d) => (
            <div key={d.date} className="bg-white rounded-2xl px-5 py-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: "#2A7AE2" }}>
                  {d.day}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{d.date.slice(5).replace("-", "/")} ({d.day})</p>
                  <p className="text-xs text-gray-400">비행 {d.count}건</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold" style={{ color: "#0D2B52" }}>{formatPrice(d.amount)}</p>
                <p className="text-xs text-gray-400">예상 정산</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ── Settlement Tab ──────────────────────────────────────────────────────────

  const SettlementTab = () => {
    const statusLabel: Record<string, { label: string; color: string; bg: string }> = {
      draft: { label: "정산 검토 중", color: "#D97706", bg: "#FFFBEB" },
      confirmed: { label: "정산 확정 완료", color: "#15803D", bg: "#F0FDF4" },
      paid: { label: "지급 완료", color: "#1D4ED8", bg: "#EFF6FF" },
    };
    const s = statusLabel[SETTLEMENT.status];

    return (
      <div>
        {/* 정산 상태 헤더 */}
        <div
          className="rounded-2xl px-5 py-4 mb-5"
          style={{ backgroundColor: s.bg, border: `1.5px solid ${s.color}30` }}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="font-bold text-gray-900">이번 주 정산</p>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: s.bg, color: s.color, border: `1px solid ${s.color}50` }}>
              {s.label}
            </span>
          </div>
          <p className="text-xs text-gray-400 mb-3">{SETTLEMENT.period}</p>
          <div className="flex items-end gap-2">
            <p className="text-3xl font-bold" style={{ color: "#0D2B52" }}>{formatPrice(SETTLEMENT.total_amount)}</p>
            <p className="text-sm text-gray-400 mb-1">/ {SETTLEMENT.total_flights}건 × {formatPrice(SETTLEMENT.rate)}</p>
          </div>
          <p className="text-xs text-gray-400 mt-2">지급 예정일: {SETTLEMENT.payment_due}</p>
        </div>

        {/* 일별 상세 */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm mb-4">
          <div className="px-5 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-600">일별 비행 상세</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="text-left px-5 py-2.5 text-xs text-gray-400 font-medium">날짜</th>
                <th className="text-center px-3 py-2.5 text-xs text-gray-400 font-medium">비행 수</th>
                <th className="text-right px-5 py-2.5 text-xs text-gray-400 font-medium">소계</th>
              </tr>
            </thead>
            <tbody>
              {SETTLEMENT.days.map((d) => (
                <tr key={d.date} className={`border-b border-gray-50 last:border-0 ${d.count === 0 ? "opacity-40" : ""}`}>
                  <td className="px-5 py-3 text-gray-700">
                    <span className="font-medium">{d.date.slice(5).replace("-", "/")}</span>
                    <span className="text-gray-400 ml-1">({d.day})</span>
                  </td>
                  <td className="px-3 py-3 text-center font-bold" style={{ color: d.count > 0 ? "#0D2B52" : "#9CA3AF" }}>
                    {d.count}건
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-gray-700">
                    {d.count > 0 ? formatPrice(d.subtotal) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: "#F4F8FF" }}>
                <td className="px-5 py-3 font-bold text-gray-900">합계</td>
                <td className="px-3 py-3 text-center font-bold" style={{ color: "#0D2B52" }}>{SETTLEMENT.total_flights}건</td>
                <td className="px-5 py-3 text-right font-bold text-lg" style={{ color: "#2A7AE2" }}>{formatPrice(SETTLEMENT.total_amount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* 안내 */}
        <div className="rounded-xl px-4 py-3 text-xs text-gray-500 flex items-start gap-2" style={{ backgroundColor: "#F5F7FA" }}>
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-gray-400" />
          <span>정산 확정 후 이의가 있으면 관리자에게 연락해 주세요. 지급 예정일은 매주 토요일 기준입니다.</span>
        </div>
      </div>
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  const tabItems: { key: Tab | "schedule"; label: string; icon: React.ReactNode }[] = [
    { key: "today",      label: "오늘 일정", icon: <CalendarDays className="w-4 h-4" /> },
    { key: "history",    label: "비행기록",  icon: <BookOpen className="w-4 h-4" /> },
    { key: "settlement", label: "정산",      icon: <Calculator className="w-4 h-4" /> },
    { key: "schedule",   label: "스케줄",    icon: <LayoutGrid className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col">
      {/* 헤더 */}
      <div className="px-5 pt-8 pb-5" style={{ backgroundColor: "#0D2B52" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wind className="w-5 h-5" style={{ color: "#FF8A00" }} />
            <span className="text-white font-bold">구름상회</span>
          </div>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
            style={{ backgroundColor: "#2A7AE2" }}>
            {PILOT.name[0]}
          </div>
        </div>
        <div>
          <p className="text-white/60 text-sm">{today}</p>
          <h1 className="text-white text-2xl font-bold mt-0.5">{PILOT.name} 파일럿</h1>
          <p className="text-white/40 text-xs mt-1">자격증 만료 {PILOT.license_expiry}</p>
        </div>

        {/* 오늘 진행 바 */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-white/50 mb-1.5">
            <span>오늘 비행 진행</span>
            <span>{completedCount} / {totalCount}건</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : "0%",
                backgroundColor: "#FF8A00",
              }}
            />
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex bg-white border-b border-gray-100 sticky top-0 z-10">
        {tabItems.map((t) => (
          <button
            key={t.key}
            onClick={() =>
              t.key === "schedule"
                ? router.push("/pilot/schedule")
                : setTab(t.key as Tab)
            }
            className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
              tab === t.key ? "border-b-2" : "text-gray-400 hover:text-gray-600"
            }`}
            style={tab === t.key ? { color: "#2A7AE2", borderBottomColor: "#2A7AE2" } : {}}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* 컨텐츠 */}
      <div className="flex-1 px-4 py-5 overflow-auto">
        {tab === "today" && <TodayTab />}
        {tab === "history" && <HistoryTab />}
        {tab === "settlement" && <SettlementTab />}
      </div>
    </div>
  );
}
