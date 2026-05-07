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
  AlertTriangle,
  ChevronRight,
  LayoutGrid,
  ListChecks,
  UserCheck,
  Split,
} from "lucide-react";
import { expandBookings, type RawBooking } from "@/lib/bookingHelpers";
import { getSlotConfig } from "@/lib/slotStore";

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

const SLOT_CAPACITY_TODAY = 4;
const TODAY_PILOTS = [
  { id: "P003", name: "박구름" },
  { id: "P001", name: "김하늘" },
  { id: "P002", name: "이비행" },
  { id: "P004", name: "최솔바람" },
];

const RAW_BOOKINGS_TODAY: RawBooking[] = [
  { booking_id: "BK-20260501-1021", start_slot: "09:00", customer_name: "이수진", headcount: 1, product_name: "베이직",   start_pilot_id: "P003" },
  { booking_id: "BK-20260501-1022", start_slot: "09:00", customer_name: "한가은", headcount: 2, product_name: "VIP",      start_pilot_id: "P001" },
  { booking_id: "BK-20260501-1045", start_slot: "10:30", customer_name: "최현우", headcount: 1, product_name: "베이직",   start_pilot_id: "P003" },
  { booking_id: "BK-20260501-1110", start_slot: "11:30", customer_name: "오세훈", headcount: 8, product_name: "익스트림", start_pilot_id: "P002" },
  { booking_id: "BK-20260501-9970", start_slot: "13:00", customer_name: "김민준", headcount: 1, product_name: "베이직",   start_pilot_id: "P003" },
  { booking_id: "BK-20260501-9971", start_slot: "13:00", customer_name: "신유리", headcount: 1, product_name: "베이직",   start_pilot_id: "P001" },
  { booking_id: "BK-20260501-2201", start_slot: "15:00", customer_name: "박지연", headcount: 2, product_name: "VIP",      start_pilot_id: "P003" },
  { booking_id: "BK-20260501-3312", start_slot: "16:30", customer_name: "정성민", headcount: 1, product_name: "익스트림", start_pilot_id: "P003" },
];

const TODAY_FLIGHTS_INIT: Flight[] = [
  { booking_id: "BK-20260501-1021", time_slot: "09:00", customer_name: "이수진",  headcount: 1, product_name: "베이직",   options: [],                      status: "completed", landed_at: "09:14" },
  { booking_id: "BK-20260501-1045", time_slot: "10:30", customer_name: "최현우",  headcount: 1, product_name: "베이직",   options: ["사진 패키지"],           status: "completed", landed_at: "10:43" },
  { booking_id: "BK-20260501-9970", time_slot: "13:00", customer_name: "김민준",  headcount: 1, product_name: "베이직",   options: ["사진 패키지"],           status: "flying" },
  { booking_id: "BK-20260501-2201", time_slot: "15:00", customer_name: "박지연",  headcount: 2, product_name: "VIP",      options: ["사진+영상 풀 패키지"],   status: "waiting" },
  { booking_id: "BK-20260501-3312", time_slot: "16:30", customer_name: "정성민",  headcount: 1, product_name: "익스트림", options: [],                      status: "waiting" },
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
      return { label: "대기 중",  bg: "#eeefe9", text: "#65675e", border: "#bfc1b7",  dot: "#9ea096" };
    case "flying":
      return { label: "비행 중",  bg: "#FFF7ED", text: "#C2410C", border: "#FED7AA",  dot: "#F54E00" };
    case "landed":
      return { label: "착륙 완료", bg: "#eeefe9", text: "#23251d", border: "#bfc1b7", dot: "#4d4f46" };
    case "completed":
      return { label: "완료",     bg: "#F0FDF4", text: "#15803D", border: "#BBF7D0",  dot: "#22C55E" };
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

  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric", month: "long", day: "numeric", weekday: "short",
  });

  const slotCfg = typeof window !== "undefined" ? getSlotConfig() : { startTime: "09:00", endTime: "17:00", intervalMinutes: 30 };
  const scheduleByTime = expandBookings(RAW_BOOKINGS_TODAY, SLOT_CAPACITY_TODAY, TODAY_PILOTS, slotCfg)
    .sort((a, b) => a.time_slot.localeCompare(b.time_slot) || a.part - b.part);

  // ── Today Tab ───────────────────────────────────────────────────────────────
  const TodayTab = () => (
    <div>
      {/* 진행 현황 */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "오늘 총 배정", value: totalCount,                       sub: "건", color: "#23251d" },
          { label: "완료",         value: completedCount,                   sub: "건", color: "#16A34A" },
          { label: "남은 비행",   value: totalCount - completedCount,       sub: "건", color: "#F54E00" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl p-4 text-center border" style={{ backgroundColor: "#fdfdf8", borderColor: "#bfc1b7" }}>
            <p className="text-2xl font-bold" style={{ color: stat.color }}>
              {stat.value}<span className="text-base font-normal ml-0.5" style={{ color: "#9ea096" }}>{stat.sub}</span>
            </p>
            <p className="text-xs mt-0.5" style={{ color: "#65675e" }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* 하루 전체 스케줄표 */}
      <div className="rounded-2xl p-4 mb-5 border" style={{ backgroundColor: "#fdfdf8", borderColor: "#bfc1b7" }}>
        <div className="flex items-center gap-2 mb-3">
          <ListChecks className="w-4 h-4" style={{ color: "#4d4f46" }} />
          <p className="text-sm font-bold" style={{ color: "#23251d" }}>하루 전체 스케줄</p>
          <span className="text-xs ml-auto" style={{ color: "#9ea096" }}>총 {scheduleByTime.length}건</span>
        </div>

        <div className="grid grid-cols-12 gap-1 px-2 pb-2 border-b" style={{ borderColor: "#e5e7e0" }}>
          {["시간", "", "인원", "", "코스", "", "", "", "담당", "", "", ""].map((h, i) => (
            <div key={i} className={`text-[10px] font-semibold ${
              i === 0 ? "col-span-3" : i === 2 ? "col-span-2 text-center" : i === 4 ? "col-span-4" : i === 8 ? "col-span-3 text-right" : "hidden"
            }`} style={{ color: "#9ea096" }}>
              {h}
            </div>
          ))}
          {/* clean header row */}
        </div>
        {/* Re-render header cleanly */}
        <div className="grid grid-cols-12 gap-1 px-2 pb-1.5 text-[10px] font-semibold border-b" style={{ color: "#9ea096", borderColor: "#e5e7e0" }}>
          <div className="col-span-3">시간</div>
          <div className="col-span-2 text-center">인원</div>
          <div className="col-span-4">코스</div>
          <div className="col-span-3 text-right">담당</div>
        </div>

        <div className="divide-y" style={{ borderColor: "#e5e7e0" }}>
          {scheduleByTime.map((s) => {
            const isMine = s.pilot_id === PILOT.id;
            const isSplit = s.totalParts > 1;
            return (
              <div
                key={`${s.booking_id}-${s.part}`}
                className="grid grid-cols-12 gap-1 px-2 py-2.5 items-center text-sm"
                style={{ backgroundColor: isMine ? "#eeefe9" : "transparent" }}
              >
                <div className="col-span-3 font-bold flex items-center gap-1" style={{ color: "#23251d" }}>
                  {s.time_slot}
                  {isSplit && (
                    <span
                      className="text-[9px] font-bold px-1 py-0.5 rounded"
                      style={{ backgroundColor: "#FEF3C7", color: "#B45309" }}
                      title={`${s.customer_name}님 단체 예약을 ${s.totalParts}개 슬롯에 분할`}
                    >
                      {s.part}/{s.totalParts}
                    </span>
                  )}
                </div>
                <div className="col-span-2 text-center">
                  <span
                    className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: s.headcount >= 4 ? "#FEF3C7" : "#e5e7e0",
                      color: s.headcount >= 4 ? "#B45309" : "#4d4f46",
                    }}
                  >
                    {s.headcount}명
                  </span>
                </div>
                <div className="col-span-4 truncate flex items-center gap-1" style={{ color: "#4d4f46" }}>
                  {s.product_name}
                  {isSplit && <Split className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                </div>
                <div className="col-span-3 text-right">
                  <span className="text-xs font-medium" style={{ color: isMine ? "#23251d" : "#9ea096" }}>
                    {isMine ? "내 비행" : s.pilot_name}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {scheduleByTime.some((s) => s.totalParts > 1) && (
          <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-700 flex items-start gap-1.5">
            <Split className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>정원(슬롯당 {SLOT_CAPACITY_TODAY}명)을 초과한 단체 예약은 인접 슬롯에 자동 분할되어 표시됩니다.</span>
          </div>
        )}
      </div>

      {/* 내게 할당된 비행 */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <UserCheck className="w-4 h-4" style={{ color: "#F54E00" }} />
        <p className="text-sm font-bold" style={{ color: "#23251d" }}>나에게 할당된 비행</p>
        <span className="text-xs ml-auto" style={{ color: "#9ea096" }}>{flights.length}건</span>
      </div>

      <div className="space-y-3">
        {flights.map((flight) => {
          const cfg = statusConfig(flight.status);
          const isFlying  = flight.status === "flying";
          const isWaiting = flight.status === "waiting";
          return (
            <div
              key={flight.booking_id}
              className="rounded-2xl p-5"
              style={{
                backgroundColor: "#fdfdf8",
                border: isFlying ? "2px solid #FED7AA" : `1.5px solid #bfc1b7`,
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="text-center w-14">
                    <p className="text-xl font-bold" style={{ color: "#23251d" }}>{flight.time_slot}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-bold" style={{ color: "#23251d" }}>{flight.customer_name}</p>
                      {flight.headcount > 1 && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: "#F54E00" }}>
                          {flight.headcount}인
                        </span>
                      )}
                    </div>
                    <p className="text-sm" style={{ color: "#65675e" }}>
                      {flight.product_name}
                      {flight.options.length > 0 && (
                        <span style={{ color: "#9ea096" }}> · {flight.options.join(", ")}</span>
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

              {(flight.status === "completed" || flight.status === "landed") && flight.landed_at && (
                <div className="flex items-center gap-1.5 text-xs text-green-600 mt-2">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>착륙 {flight.landed_at} · 예약번호 {flight.booking_id}</span>
                </div>
              )}

              {isWaiting && (
                <button
                  onClick={() => setFlights((prev) =>
                    prev.map((f) => f.booking_id === flight.booking_id ? { ...f, status: "flying" } : f)
                  )}
                  className="mt-3 w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                  style={{ backgroundColor: "#23251d" }}
                >
                  비행 시작
                </button>
              )}
              {isFlying && (
                <button
                  onClick={() => handleLand(flight.booking_id)}
                  disabled={landingFlight === flight.booking_id}
                  className="mt-3 w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
                  style={{ backgroundColor: "#F54E00" }}
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
            <p className="font-bold" style={{ color: "#23251d" }}>이번 주 비행기록</p>
            <p className="text-sm" style={{ color: "#9ea096" }}>2026-04-28 ~ 2026-05-04</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold" style={{ color: "#23251d" }}>
              {totalThisWeek}<span className="text-base font-normal ml-0.5" style={{ color: "#9ea096" }}>건</span>
            </p>
            <p className="text-xs" style={{ color: "#9ea096" }}>누적 {PILOT.total_flights_all.toLocaleString()}건</p>
          </div>
        </div>

        <div className="rounded-2xl p-5 mb-5 border" style={{ backgroundColor: "#fdfdf8", borderColor: "#bfc1b7" }}>
          <div className="flex items-end gap-2 h-28">
            {FLIGHT_HISTORY.map((d) => {
              const maxCount = Math.max(...FLIGHT_HISTORY.map((x) => x.count));
              const heightPct = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
              const isToday = d.date === new Date().toISOString().split("T")[0];
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-bold" style={{ color: "#4d4f46" }}>{d.count}</span>
                  <div className="w-full rounded-t-lg transition-all" style={{
                    height: `${Math.max(heightPct, 8)}%`,
                    backgroundColor: isToday ? "#F54E00" : "#4d4f46",
                    opacity: d.count === 0 ? 0.2 : 1,
                  }} />
                  <span className="text-xs" style={{ color: "#9ea096" }}>{d.day}</span>
                </div>
              );
            })}
            {["금", "토", "일"].map((day) => (
              <div key={day} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-bold" style={{ color: "#bfc1b7" }}>0</span>
                <div className="w-full rounded-t-lg" style={{ height: "8%", backgroundColor: "#e5e7e0" }} />
                <span className="text-xs" style={{ color: "#bfc1b7" }}>{day}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {FLIGHT_HISTORY.map((d) => (
            <div key={d.date} className="rounded-2xl px-5 py-4 flex items-center justify-between border" style={{ backgroundColor: "#fdfdf8", borderColor: "#bfc1b7" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: "#4d4f46" }}>
                  {d.day}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "#23251d" }}>{d.date.slice(5).replace("-", "/")} ({d.day})</p>
                  <p className="text-xs" style={{ color: "#9ea096" }}>비행 {d.count}건</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold" style={{ color: "#23251d" }}>{formatPrice(d.amount)}</p>
                <p className="text-xs" style={{ color: "#9ea096" }}>예상 정산</p>
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
      draft:     { label: "정산 검토 중",    color: "#D97706", bg: "#FFFBEB" },
      confirmed: { label: "정산 확정 완료",  color: "#15803D", bg: "#F0FDF4" },
      paid:      { label: "지급 완료",       color: "#23251d", bg: "#eeefe9" },
    };
    const s = statusLabel[SETTLEMENT.status];

    return (
      <div>
        <div
          className="rounded-2xl px-5 py-4 mb-5 border"
          style={{ backgroundColor: s.bg, borderColor: `${s.color}30` }}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="font-bold" style={{ color: "#23251d" }}>이번 주 정산</p>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: s.bg, color: s.color, border: `1px solid ${s.color}50` }}>
              {s.label}
            </span>
          </div>
          <p className="text-xs mb-3" style={{ color: "#9ea096" }}>{SETTLEMENT.period}</p>
          <div className="flex items-end gap-2">
            <p className="text-3xl font-bold" style={{ color: "#23251d" }}>{formatPrice(SETTLEMENT.total_amount)}</p>
            <p className="text-sm mb-1" style={{ color: "#9ea096" }}>/ {SETTLEMENT.total_flights}건 × {formatPrice(SETTLEMENT.rate)}</p>
          </div>
          <p className="text-xs mt-2" style={{ color: "#9ea096" }}>지급 예정일: {SETTLEMENT.payment_due}</p>
        </div>

        <div className="rounded-2xl overflow-hidden mb-4 border" style={{ borderColor: "#bfc1b7" }}>
          <div className="px-5 py-3 border-b" style={{ borderColor: "#e5e7e0", backgroundColor: "#fdfdf8" }}>
            <p className="text-sm font-semibold" style={{ color: "#65675e" }}>일별 비행 상세</p>
          </div>
          <table className="w-full text-sm" style={{ backgroundColor: "#fdfdf8" }}>
            <thead>
              <tr className="border-b" style={{ borderColor: "#e5e7e0" }}>
                <th className="text-left px-5 py-2.5 text-xs font-medium" style={{ color: "#9ea096" }}>날짜</th>
                <th className="text-center px-3 py-2.5 text-xs font-medium" style={{ color: "#9ea096" }}>비행 수</th>
                <th className="text-right px-5 py-2.5 text-xs font-medium" style={{ color: "#9ea096" }}>소계</th>
              </tr>
            </thead>
            <tbody>
              {SETTLEMENT.days.map((d) => (
                <tr key={d.date} className={`border-b last:border-0 ${d.count === 0 ? "opacity-40" : ""}`} style={{ borderColor: "#e5e7e0" }}>
                  <td className="px-5 py-3" style={{ color: "#4d4f46" }}>
                    <span className="font-medium">{d.date.slice(5).replace("-", "/")}</span>
                    <span className="ml-1" style={{ color: "#9ea096" }}>({d.day})</span>
                  </td>
                  <td className="px-3 py-3 text-center font-bold" style={{ color: d.count > 0 ? "#23251d" : "#9ea096" }}>
                    {d.count}건
                  </td>
                  <td className="px-5 py-3 text-right font-semibold" style={{ color: "#4d4f46" }}>
                    {d.count > 0 ? formatPrice(d.subtotal) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: "#eeefe9" }}>
                <td className="px-5 py-3 font-bold" style={{ color: "#23251d" }}>합계</td>
                <td className="px-3 py-3 text-center font-bold" style={{ color: "#23251d" }}>{SETTLEMENT.total_flights}건</td>
                <td className="px-5 py-3 text-right font-bold text-lg" style={{ color: "#23251d" }}>{formatPrice(SETTLEMENT.total_amount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="rounded-xl px-4 py-3 text-xs flex items-start gap-2" style={{ backgroundColor: "#eeefe9", color: "#65675e" }}>
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "#9ea096" }} />
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
    <div className="max-w-md mx-auto min-h-screen flex flex-col" style={{ backgroundColor: "#eeefe9" }}>
      {/* 헤더 */}
      <div className="px-5 pt-8 pb-5" style={{ backgroundColor: "#23251d" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wind className="w-5 h-5" style={{ color: "#F54E00" }} />
            <span className="text-white font-bold">구름상회</span>
          </div>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
            style={{ backgroundColor: "#4d4f46" }}>
            {PILOT.name[0]}
          </div>
        </div>
        <div>
          <p className="text-white/60 text-sm">{today}</p>
          <h1 className="text-white text-2xl font-bold mt-0.5">{PILOT.name} 파일럿</h1>
          <p className="text-white/40 text-xs mt-1">자격증 만료 {PILOT.license_expiry}</p>
        </div>

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
                backgroundColor: "#F54E00",
              }}
            />
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex border-b sticky top-0 z-10" style={{ backgroundColor: "#fdfdf8", borderColor: "#bfc1b7" }}>
        {tabItems.map((t) => (
          <button
            key={t.key}
            onClick={() =>
              t.key === "schedule"
                ? router.push("/pilot/schedule")
                : setTab(t.key as Tab)
            }
            className="flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors"
            style={
              tab === t.key
                ? { color: "#23251d", borderBottom: "2px solid #23251d" }
                : { color: "#9ea096" }
            }
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* 컨텐츠 */}
      <div className="flex-1 px-4 py-5 overflow-auto">
        {tab === "today"      && <TodayTab />}
        {tab === "history"    && <HistoryTab />}
        {tab === "settlement" && <SettlementTab />}
      </div>
    </div>
  );
}
