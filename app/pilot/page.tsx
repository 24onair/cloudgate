"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Wind,
  CalendarDays,
  BookOpen,
  Calculator,
  CheckCircle2,
  AlertTriangle,
  LayoutGrid,
  ListChecks,
  UserCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// ─── API Types ────────────────────────────────────────────────────────────────

interface DbPilot {
  id: string;
  name: string;
  license_expiry?: string;
  total_flights?: number;
  status?: string;
}

interface BookingPilot {
  pilot_id: string;
  slot_no: number;
}

interface ApiBooking {
  id: string;
  booking_no: string;
  customer_name: string;
  product_name: string;
  headcount: number;
  flight_date: string;
  flight_time: string;
  options: (string | { name: string })[] | null;
  status: string;
  pilot_id: string | null;
  booking_pilots?: BookingPilot[];
}

interface FlightRecord {
  id: string;
  booking_id: string;
  pilot_id: string;
  flight_date: string;
  landing_at: string | null;
  bookings?: {
    booking_no: string;
    customer_name: string;
    product_name: string;
    headcount: number;
    flight_time?: string;
    options?: (string | { name: string })[] | null;
  };
}

interface WeekDaySummary {
  date: string;
  day: string;
  count: number;
  amount: number;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type FlightStatus = "waiting" | "flying" | "completed";

interface MyFlight {
  booking_id: string;
  time_slot: string;
  customer_name: string;
  headcount: number;
  product_name: string;
  options: string[];
  status: FlightStatus;
  landed_at?: string;
}

// ─── 내 비행 변환 ──────────────────────────────────────────────────────────────
function toMyFlight(b: ApiBooking): MyFlight {
  const status: FlightStatus =
    b.status === "flying"    ? "flying"    :
    b.status === "completed" ? "completed" :
                               "waiting";
  const options = Array.isArray(b.options)
    ? b.options.map((o) => (typeof o === "string" ? o : (o as { name: string }).name))
    : [];
  return {
    booking_id:    b.id,
    time_slot:     b.flight_time?.slice(0, 5) ?? "",
    customer_name: b.customer_name,
    headcount:     b.headcount,
    product_name:  b.product_name,
    options,
    status,
  };
}

// ─── 로컬 날짜 문자열 (타임존 안전) ────────────────────────────────────────────
function localDateStr(d: Date): string {
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

// ─── 이번 주 월요일 계산 ────────────────────────────────────────────────────────
function getWeekStart(): string {
  const d = new Date();
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return localDateStr(d);
}

// ─── 정산 타입 정의 ────────────────────────────────────────────────────────────

type SettlementStatus = "draft" | "confirmed" | "paid";

interface SettlementDay {
  date: string;   // "YYYY-MM-DD"
  day: string;    // "월~일"
  count: number;
  subtotal: number;
}

interface MonthRecord {
  month: string;           // "YYYY-MM"
  label: string;           // "2026년 5월"
  status: SettlementStatus;
  rate: number;
  payment_due?: string;
  paid_at?: string;
  days: SettlementDay[];
}

function monthTotal(m: MonthRecord) {
  return m.days.reduce((s, d) => s + d.count, 0);
}
function monthAmount(m: MonthRecord) {
  return m.days.reduce((s, d) => s + d.subtotal, 0);
}

// 주별 헬퍼 — 해당 날짜가 속한 주의 월요일 반환
function mondayOf(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

const KR_DAYS = ["일", "월", "화", "수", "목", "금", "토"];

// 주 범위 레이블: "5/5(월)~5/11(일)"
function weekRangeLabel(mondayStr: string): string {
  const mon = new Date(mondayStr + "T00:00:00");
  const sun = new Date(mondayStr + "T00:00:00");
  sun.setDate(sun.getDate() + 6);
  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
  return `${fmt(mon)}(${KR_DAYS[mon.getDay()]})~${fmt(sun)}(${KR_DAYS[sun.getDay()]})`;
}

// 주 번호 레이블: "5월 1주차"
function weekOrdinalLabel(mondayStr: string): string {
  const mon = new Date(mondayStr + "T00:00:00");
  const y = mon.getFullYear(), mth = mon.getMonth();
  const firstDay = new Date(y, mth, 1);
  const firstMon = new Date(firstDay);
  const fd = firstDay.getDay();
  firstMon.setDate(firstDay.getDate() + (fd === 0 ? 1 : fd === 1 ? 0 : 8 - fd));
  const weekNo = Math.floor((mon.getTime() - firstMon.getTime()) / (7 * 86400000)) + 1;
  return `${mth + 1}월 ${Math.max(weekNo, 1)}주차`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

function statusConfig(status: FlightStatus) {
  switch (status) {
    case "waiting":
      return { label: "대기 중",   bg: "#eeefe9", text: "#65675e", border: "#bfc1b7", dot: "#9ea096" };
    case "flying":
      return { label: "비행 중",   bg: "#FFF7ED", text: "#C2410C", border: "#FED7AA", dot: "#F54E00" };
    case "completed":
      return { label: "완료",      bg: "#F0FDF4", text: "#15803D", border: "#BBF7D0", dot: "#22C55E" };
  }
}

/** 비행 카드 제목 — 단체면 "OOO 그룹", 1인이면 "OOO" */
function flightTitle(f: MyFlight): string {
  return f.headcount === 1 ? f.customer_name : `${f.customer_name} 그룹`;
}

type SettleView = "monthly" | "weekly" | "daily" | "cumulative";
type Tab = "today" | "history" | "settlement" | "schedule";

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PilotPortalPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("today");

  // ── 파일럿 ID/정보
  const [pilotId, setPilotId]     = useState<string | null>(null);
  const [pilotInfo, setPilotInfo] = useState<DbPilot | null>(null);

  // ── 오늘 비행
  const [flights, setFlights]               = useState<MyFlight[]>([]);
  const [allTodayBookings, setAllTodayBookings] = useState<ApiBooking[]>([]);
  const [loadingFlights, setLoadingFlights] = useState(true);

  // ── 주간 비행기록
  const [weekRecords, setWeekRecords] = useState<FlightRecord[]>([]);

  // ── 히스토리 상세
  const [historyDetailRecords, setHistoryDetailRecords] = useState<FlightRecord[]>([]);
  const [historyDetailLoading, setHistoryDetailLoading] = useState(false);

  const [landingKey, setLandingKey] = useState<string | null>(null);
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string | null>(null);

  // ── 정산 데이터 (API)
  const [settlements, setSettlements]         = useState<MonthRecord[]>([]);
  const [settlementRate, setSettlementRate]   = useState(30000);
  const [loadingSettlement, setLoadingSettlement] = useState(false);

  // ── 정산 탭 상태
  const [settleView, setSettleView]           = useState<SettleView>("monthly");
  const [settlementMonthIdx, setSettlementMonthIdx] = useState(0);
  const [settleWeekIdx, setSettleWeekIdx]     = useState(0);
  const [settleDayIdx, setSettleDayIdx]       = useState(0);
  const [settleDayShowDetail, setSettleDayShowDetail] = useState(false);
  const [cumulFrom, setCumulFrom]             = useState("");
  const [cumulTo, setCumulTo]                 = useState("");

  // ── 정산 파생 데이터 (useMemo)
  const ALL_SDAYS = useMemo<SettlementDay[]>(
    () => settlements.flatMap((m) => m.days).sort((a, b) => a.date.localeCompare(b.date)),
    [settlements]
  );
  const WEEK_MAP = useMemo<Record<string, SettlementDay[]>>(() => {
    const m: Record<string, SettlementDay[]> = {};
    for (const d of ALL_SDAYS) { const mon = mondayOf(d.date); (m[mon] ??= []).push(d); }
    return m;
  }, [ALL_SDAYS]);
  const WEEK_KEYS = useMemo(() => Object.keys(WEEK_MAP).sort().reverse(), [WEEK_MAP]);

  // ── 스케줄 탭 상태
  const [scheduleYearMonth, setScheduleYearMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [scheduleData, setScheduleData]       = useState<Record<string, string>>({});  // date→status
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  // ── 파일럿 ID 로드 (세션 쿠키 → /api/pilot/me)
  useEffect(() => {
    fetch("/api/pilot/me")
      .then((r) => {
        if (!r.ok) { router.replace("/pilot/login"); return null; }
        return r.json();
      })
      .then((pilot: DbPilot | null) => {
        if (pilot) setPilotId(pilot.id);
      })
      .catch(() => router.replace("/pilot/login"));
  }, [router]);

  // ── 파일럿 정보 로드
  useEffect(() => {
    if (!pilotId) return;
    fetch("/api/pilots")
      .then((r) => r.json())
      .then((pilots: DbPilot[]) => {
        const p = pilots.find((x) => x.id === pilotId);
        if (p) setPilotInfo(p);
      })
      .catch(console.error);
  }, [pilotId]);

  // ── 오늘 예약 로드 (내 배정 필터링)
  const fetchTodayData = useCallback(async () => {
    if (!pilotId) return;
    const today = new Date().toISOString().slice(0, 10);
    try {
      const res = await fetch(`/api/bookings?date=${today}`);
      const data: ApiBooking[] = await res.json();
      setAllTodayBookings(data);
      const mine = data.filter((b) =>
        b.booking_pilots?.some((bp) => bp.pilot_id === pilotId) ||
        b.pilot_id === pilotId
      );
      setFlights(mine.map(toMyFlight));
    } catch (err) {
      console.error("오늘 예약 조회 실패:", err);
    } finally {
      setLoadingFlights(false);
    }
  }, [pilotId]);

  useEffect(() => {
    fetchTodayData();
  }, [fetchTodayData]);

  // ── 주간 비행기록 로드
  const fetchWeekRecords = useCallback(async () => {
    if (!pilotId) return;
    const from = getWeekStart();
    try {
      const res = await fetch(`/api/flight_records?pilot_id=${pilotId}&from=${from}`);
      const data: FlightRecord[] = await res.json();
      setWeekRecords(data);
    } catch (err) {
      console.error("주간 비행기록 조회 실패:", err);
    }
  }, [pilotId]);

  useEffect(() => {
    fetchWeekRecords();
  }, [fetchWeekRecords]);

  // ── 정산 데이터 로드 (API)
  useEffect(() => {
    if (!pilotId) return;
    setLoadingSettlement(true);
    fetch("/api/pilot/settlement")
      .then((r) => r.json())
      .then((data: { months: MonthRecord[]; rate: number }) => {
        if (Array.isArray(data.months)) {
          setSettlements(data.months);
          setSettlementRate(data.rate ?? 30000);
          // 초기 인덱스/범위 설정
          const allDays = data.months.flatMap((m) => m.days).sort((a, b) => a.date.localeCompare(b.date));
          if (allDays.length > 0) {
            setSettleDayIdx(allDays.length - 1);
            setCumulFrom(allDays[0].date);
            setCumulTo(allDays[allDays.length - 1].date);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoadingSettlement(false));
  }, [pilotId]);

  // ── 스케줄 데이터 로드 (API)
  useEffect(() => {
    if (!pilotId) return;
    setLoadingSchedule(true);
    fetch(`/api/schedules?year_month=${scheduleYearMonth}`)
      .then((r) => r.json())
      .then((data: Record<string, Record<string, string>>) => {
        setScheduleData(data[pilotId] ?? {});
      })
      .catch(console.error)
      .finally(() => setLoadingSchedule(false));
  }, [pilotId, scheduleYearMonth]);

  // ── 히스토리 날짜 상세 로드
  useEffect(() => {
    if (!selectedHistoryDate || !pilotId) return;
    setHistoryDetailLoading(true);
    setHistoryDetailRecords([]);
    fetch(`/api/flight_records?pilot_id=${pilotId}&date=${selectedHistoryDate}`)
      .then((r) => r.json())
      .then((data: FlightRecord[]) => setHistoryDetailRecords(data))
      .catch(console.error)
      .finally(() => setHistoryDetailLoading(false));
  }, [selectedHistoryDate, pilotId]);

  // ── 주간 요약 계산
  const weekDaySummaries: WeekDaySummary[] = (() => {
    const map: Record<string, WeekDaySummary> = {};
    for (const r of weekRecords) {
      const d = r.flight_date;
      if (!map[d]) {
        const dow = new Date(d + "T00:00:00").getDay();
        map[d] = { date: d, day: KR_DAYS[dow], count: 0, amount: 0 };
      }
      map[d].count  += 1;
      map[d].amount += settlementRate;
    }
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  })();

  const completedCount = flights.filter((f) => f.status === "completed").length;
  const totalCount     = flights.length;

  function flightKey(f: MyFlight) {
    return f.booking_id;
  }

  // ── 비행 시작 (API PATCH + local state)
  async function handleTakeoff(bookingId: string) {
    try {
      await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "flying" }),
      });
      setFlights((prev) =>
        prev.map((x) => x.booking_id === bookingId ? { ...x, status: "flying" } : x)
      );
    } catch (err) {
      console.error("비행 시작 처리 실패:", err);
    }
  }

  // ── 착륙 완료 (API PATCH + POST flight_record + local state)
  async function handleLand(f: MyFlight) {
    const key = flightKey(f);
    setLandingKey(key);
    try {
      const now  = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const today = now.toISOString().slice(0, 10);

      await fetch(`/api/bookings/${f.booking_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      await fetch("/api/flight_records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id:  f.booking_id,
          pilot_id:    pilotId,
          flight_date: today,
          landing_at:  hhmm,
        }),
      });

      setFlights((prev) =>
        prev.map((x) =>
          flightKey(x) === key ? { ...x, status: "completed", landed_at: hhmm } : x
        )
      );
      // 주간 기록 갱신
      fetchWeekRecords();
    } catch (err) {
      console.error("착륙 처리 실패:", err);
    } finally {
      setLandingKey(null);
    }
  }

  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric", month: "long", day: "numeric", weekday: "short",
  });

  // ── Today Tab ───────────────────────────────────────────────────────────────
  const TodayTab = () => (
    <div>
      {/* 진행 현황 */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "오늘 총 배정", value: totalCount,                 sub: "건", color: "#23251d" },
          { label: "완료",         value: completedCount,             sub: "건", color: "#16A34A" },
          { label: "남은 비행",   value: totalCount - completedCount, sub: "건", color: "#F54E00" },
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
          <span className="text-xs ml-auto" style={{ color: "#9ea096" }}>총 {allTodayBookings.length}건</span>
        </div>

        {/* 헤더 */}
        <div
          className="grid gap-1 px-2 pb-1.5 text-[10px] font-semibold border-b"
          style={{
            gridTemplateColumns: "2fr 2.5fr 1.5fr 2.5fr 1.5fr",
            color: "#9ea096",
            borderColor: "#e5e7e0",
          }}
        >
          <div>시간</div>
          <div>예약자</div>
          <div className="text-center">인원</div>
          <div>코스</div>
          <div className="text-right">배정</div>
        </div>

        <div className="divide-y" style={{ borderColor: "#e5e7e0" }}>
          {allTodayBookings
            .slice()
            .sort((a, b) => (a.flight_time ?? "").localeCompare(b.flight_time ?? ""))
            .map((b) => {
              const isMine =
                b.booking_pilots?.some((bp) => bp.pilot_id === pilotId) ||
                b.pilot_id === pilotId;
              return (
                <div
                  key={b.id}
                  className="grid gap-1 px-2 py-2.5 items-center text-sm"
                  style={{
                    gridTemplateColumns: "2fr 2.5fr 1.5fr 2.5fr 1.5fr",
                    backgroundColor: isMine ? "#eeefe9" : "transparent",
                  }}
                >
                  <div className="font-bold text-xs" style={{ color: "#23251d" }}>
                    {b.flight_time?.slice(0, 5) ?? "—"}
                  </div>
                  <div className="truncate text-xs" style={{ color: isMine ? "#23251d" : "#65675e" }}>
                    {b.customer_name}
                  </div>
                  <div className="text-center">
                    <span
                      className="inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                      style={{
                        backgroundColor: (b.headcount ?? 1) >= 4 ? "#FEF3C7" : "#e5e7e0",
                        color: (b.headcount ?? 1) >= 4 ? "#B45309" : "#4d4f46",
                      }}
                    >
                      {b.headcount ?? 1}명
                    </span>
                  </div>
                  <div className="truncate text-xs" style={{ color: "#65675e" }}>
                    {b.product_name}
                  </div>
                  <div className="text-right text-xs font-semibold">
                    {isMine ? (
                      <span style={{ color: "#F54E00" }}>배정</span>
                    ) : (
                      <span style={{ color: "#bfc1b7" }}>—</span>
                    )}
                  </div>
                </div>
              );
            })}
        </div>

        {allTodayBookings.length === 0 && !loadingFlights && (
          <p className="text-center text-xs py-4" style={{ color: "#9ea096" }}>오늘 예약이 없습니다</p>
        )}
      </div>

      {/* 나에게 할당된 비행 */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <UserCheck className="w-4 h-4" style={{ color: "#F54E00" }} />
        <p className="text-sm font-bold" style={{ color: "#23251d" }}>나에게 할당된 비행</p>
        <span className="text-xs ml-auto" style={{ color: "#9ea096" }}>{flights.length}건</span>
      </div>

      {loadingFlights ? (
        <div className="text-center py-8 text-sm" style={{ color: "#9ea096" }}>불러오는 중...</div>
      ) : flights.length === 0 ? (
        <div className="rounded-2xl p-8 text-center border" style={{ backgroundColor: "#fdfdf8", borderColor: "#bfc1b7" }}>
          <p className="text-sm" style={{ color: "#9ea096" }}>배정된 비행이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {flights.map((flight) => {
            const cfg = statusConfig(flight.status);
            const key = flightKey(flight);
            const isFlying  = flight.status === "flying";
            const isWaiting = flight.status === "waiting";
            const isGroup   = flight.headcount > 1;

            return (
              <div
                key={key}
                className="rounded-2xl p-5"
                style={{
                  backgroundColor: "#fdfdf8",
                  border: isFlying ? "2px solid #FED7AA" : "1.5px solid #bfc1b7",
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="text-center w-14">
                      <p className="text-xl font-bold" style={{ color: "#23251d" }}>{flight.time_slot}</p>
                      {isGroup && (
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: "#FEF3C7", color: "#B45309" }}
                        >
                          {flight.headcount}명
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-bold" style={{ color: "#23251d" }}>
                          {flightTitle(flight)}
                        </p>
                      </div>
                      <p className="text-sm" style={{ color: "#65675e" }}>
                        {flight.product_name}
                        {flight.options.length > 0 && (
                          <span style={{ color: "#9ea096" }}> · {flight.options.join(", ")}</span>
                        )}
                      </p>
                      {isGroup && (
                        <p className="text-xs mt-0.5" style={{ color: "#9ea096" }}>
                          일행 {flight.headcount}명 단체
                        </p>
                      )}
                    </div>
                  </div>
                  <span
                    className="text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 whitespace-nowrap"
                    style={{ backgroundColor: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.dot }} />
                    {cfg.label}
                  </span>
                </div>

                {flight.status === "completed" && flight.landed_at && (
                  <div className="flex items-center gap-1.5 text-xs text-green-600 mt-2">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>착륙 {flight.landed_at} · {flight.booking_id}</span>
                  </div>
                )}

                {isWaiting && (
                  <button
                    onClick={() => handleTakeoff(flight.booking_id)}
                    className="mt-3 w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                    style={{ backgroundColor: "#23251d" }}
                  >
                    비행 시작
                  </button>
                )}
                {isFlying && (
                  <button
                    onClick={() => handleLand(flight)}
                    disabled={landingKey === key}
                    className="mt-3 w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
                    style={{ backgroundColor: "#F54E00" }}
                  >
                    {landingKey === key ? "처리 중..." : "착륙 완료 처리"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ── History Tab ─────────────────────────────────────────────────────────────
  const HistoryTab = () => {
    // ── 상세 뷰 ──
    if (selectedHistoryDate) {
      const daySummary = weekDaySummaries.find((x) => x.date === selectedHistoryDate);
      const detailCount  = historyDetailRecords.length;
      const detailAmount = detailCount * settlementRate;
      const dayLabel = (() => {
        const dow = new Date(selectedHistoryDate + "T00:00:00").getDay();
        return KR_DAYS[dow];
      })();

      return (
        <div>
          <button
            onClick={() => setSelectedHistoryDate(null)}
            className="flex items-center gap-1.5 mb-4 text-sm font-semibold"
            style={{ color: "#4d4f46" }}
          >
            <ChevronLeft className="w-4 h-4" />
            비행기록으로
          </button>

          <div className="rounded-2xl px-5 py-4 mb-4 border" style={{ backgroundColor: "#fdfdf8", borderColor: "#bfc1b7" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-lg" style={{ color: "#23251d" }}>
                  {selectedHistoryDate.slice(5).replace("-", "/")} ({dayLabel})
                </p>
                <p className="text-sm mt-0.5" style={{ color: "#9ea096" }}>
                  비행 {daySummary?.count ?? detailCount}건
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold" style={{ color: "#23251d" }}>
                  {formatPrice(daySummary?.amount ?? detailAmount)}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "#9ea096" }}>예상 정산</p>
              </div>
            </div>
          </div>

          {historyDetailLoading ? (
            <div className="text-center py-8 text-sm" style={{ color: "#9ea096" }}>불러오는 중...</div>
          ) : historyDetailRecords.length === 0 ? (
            <div className="rounded-2xl px-5 py-8 text-center border text-sm"
              style={{ backgroundColor: "#fdfdf8", borderColor: "#bfc1b7", color: "#9ea096" }}>
              상세 비행 기록이 없습니다
            </div>
          ) : (
            <div className="space-y-3">
              {historyDetailRecords.map((r, i) => {
                const bk     = r.bookings;
                const isGroup = (bk?.headcount ?? 1) > 1;
                const timeSlot = bk?.flight_time?.slice(0, 5) ?? "—";
                const opts: string[] = Array.isArray(bk?.options)
                  ? (bk!.options as (string | { name: string })[]).map((o) =>
                      typeof o === "string" ? o : o.name
                    )
                  : [];
                return (
                  <div
                    key={`${r.id}-${i}`}
                    className="rounded-2xl p-5 border"
                    style={{ backgroundColor: "#fdfdf8", borderColor: "#bfc1b7" }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="text-center w-14">
                          <p className="text-xl font-bold" style={{ color: "#23251d" }}>{timeSlot}</p>
                          {isGroup && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{ backgroundColor: "#FEF3C7", color: "#B45309" }}>
                              {bk?.headcount}명
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-bold" style={{ color: "#23251d" }}>
                            {isGroup ? `${bk?.customer_name} 그룹` : bk?.customer_name ?? "—"}
                          </p>
                          <p className="text-sm" style={{ color: "#65675e" }}>
                            {bk?.product_name ?? "—"}
                            {opts.length > 0 && (
                              <span style={{ color: "#9ea096" }}> · {opts.join(", ")}</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <span
                        className="text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 whitespace-nowrap"
                        style={{ backgroundColor: "#F0FDF4", color: "#15803D", border: "1px solid #BBF7D0" }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        완료
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs mt-1" style={{ color: "#9ea096" }}>
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                      <span>착륙 {r.landing_at ?? "—"} · {bk?.booking_no ?? r.booking_id}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    // ── 목록 뷰 ──
    const totalThisWeek = weekDaySummaries.reduce((s, d) => s + d.count, 0);
    const weekStart = getWeekStart();
    const weekEnd   = (() => {
      const d = new Date(weekStart + "T12:00:00"); // 정오 기준으로 타임존 안전
      d.setDate(d.getDate() + 6);
      return localDateStr(d);
    })();

    // 월~일 7개 바 데이터
    const weekBarDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart + "T12:00:00");
      d.setDate(d.getDate() + i);
      const dateStr = localDateStr(d);
      const summary = weekDaySummaries.find((s) => s.date === dateStr);
      return {
        date:  dateStr,
        day:   KR_DAYS[d.getDay()],
        count: summary?.count ?? 0,
      };
    });

    return (
      <div>
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="font-bold" style={{ color: "#23251d" }}>이번 주 비행기록</p>
            <p className="text-sm" style={{ color: "#9ea096" }}>{weekStart} ~ {weekEnd}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold" style={{ color: "#23251d" }}>
              {totalThisWeek}<span className="text-base font-normal ml-0.5" style={{ color: "#9ea096" }}>건</span>
            </p>
            <p className="text-xs" style={{ color: "#9ea096" }}>
              누적 {(pilotInfo?.total_flights ?? weekRecords.length).toLocaleString()}건
            </p>
          </div>
        </div>

        {/* 주간 바 차트 */}
        <div className="rounded-2xl p-5 mb-5 border" style={{ backgroundColor: "#fdfdf8", borderColor: "#bfc1b7" }}>
          <div className="flex items-end gap-2 h-28">
            {weekBarDays.map((d) => {
              const maxCount = Math.max(...weekBarDays.map((x) => x.count), 1);
              const heightPct = (d.count / maxCount) * 100;
              const isToday   = d.date === new Date().toISOString().slice(0, 10);
              const clickable = d.count > 0;
              return (
                <div
                  key={d.date}
                  className="flex-1 flex flex-col items-center gap-1"
                  style={{ cursor: clickable ? "pointer" : "default" }}
                  onClick={() => clickable && setSelectedHistoryDate(d.date)}
                >
                  <span className="text-xs font-bold" style={{ color: d.count > 0 ? "#4d4f46" : "#bfc1b7" }}>
                    {d.count}
                  </span>
                  <div className="w-full rounded-t-lg transition-all" style={{
                    height: `${Math.max(heightPct, 8)}%`,
                    backgroundColor: isToday ? "#F54E00" : (d.count > 0 ? "#4d4f46" : "#e5e7e0"),
                  }} />
                  <span className="text-xs" style={{ color: d.count > 0 ? "#9ea096" : "#bfc1b7" }}>{d.day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 날짜 카드 목록 */}
        {weekDaySummaries.length === 0 ? (
          <div className="rounded-2xl px-5 py-8 text-center border text-sm"
            style={{ backgroundColor: "#fdfdf8", borderColor: "#bfc1b7", color: "#9ea096" }}>
            이번 주 비행 기록이 없습니다
          </div>
        ) : (
          <div className="space-y-2">
            {weekDaySummaries
              .slice()
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((d) => (
                <button
                  key={d.date}
                  onClick={() => setSelectedHistoryDate(d.date)}
                  className="w-full rounded-2xl px-5 py-4 flex items-center justify-between border text-left transition-all active:scale-[0.98]"
                  style={{ backgroundColor: "#fdfdf8", borderColor: "#bfc1b7" }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white"
                      style={{ backgroundColor: "#4d4f46" }}
                    >
                      {d.day}
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "#23251d" }}>
                        {d.date.slice(5).replace("-", "/")} ({d.day})
                      </p>
                      <p className="text-xs" style={{ color: "#9ea096" }}>비행 {d.count}건</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-bold" style={{ color: "#23251d" }}>{formatPrice(d.amount)}</p>
                      <p className="text-xs" style={{ color: "#9ea096" }}>예상 정산</p>
                    </div>
                    <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "#bfc1b7" }} />
                  </div>
                </button>
              ))}
          </div>
        )}
      </div>
    );
  };

  // ── Schedule Tab ─────────────────────────────────────────────────────────────
  const ScheduleTab = () => {
    const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
      working: { label: "출근", bg: "#DCFCE7", color: "#16A34A" },
      standby: { label: "대기", bg: "#FEF3C7", color: "#D97706" },
      off:     { label: "휴무", bg: "#FEE2E2", color: "#DC2626" },
      etc:     { label: "기타", bg: "#EDE9FE", color: "#7C3AED" },
    };

    const [y, mo] = scheduleYearMonth.split("-").map(Number);
    const daysInMonth = new Date(y, mo, 0).getDate();
    const firstDow = new Date(y, mo - 1, 1).getDay(); // 0=일

    const prevMonth = () => {
      const d = new Date(y, mo - 2, 1);
      setScheduleYearMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    };
    const nextMonth = () => {
      const d = new Date(y, mo, 1);
      setScheduleYearMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    };

    const cells: (string | null)[] = [
      ...Array(firstDow).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => {
        const dd = String(i + 1).padStart(2, "0");
        return `${scheduleYearMonth}-${dd}`;
      }),
    ];
    // 6주 그리드 위해 뒤를 null로 채움
    while (cells.length % 7 !== 0) cells.push(null);

    const todayStr = new Date().toLocaleDateString("sv-SE"); // "YYYY-MM-DD"

    return (
      <div>
        {/* 월 네비게이션 */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-2 rounded-full" style={{ color: "#4d4f46" }}>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-bold text-base" style={{ color: "#23251d" }}>{y}년 {mo}월</span>
          <button onClick={nextMonth} className="p-2 rounded-full" style={{ color: "#4d4f46" }}>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* 안내 */}
        <div className="text-xs rounded-xl px-4 py-3 mb-4 flex items-center gap-2"
          style={{ backgroundColor: "#eeefe9", color: "#65675e" }}>
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#9ea096" }} />
          <span>날짜를 탭하면 출근 → 휴무 → 대기 순으로 변경됩니다. 관리자 화면에 즉시 반영됩니다.</span>
        </div>

        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 mb-1">
          {["일","월","화","수","목","금","토"].map((d, i) => (
            <div key={d} className="text-center text-[11px] font-semibold py-1"
              style={{ color: i === 0 ? "#DC2626" : i === 6 ? "#2563EB" : "#9ea096" }}>
              {d}
            </div>
          ))}
        </div>

        {/* 달력 셀 */}
        {loadingSchedule ? (
          <div className="text-center py-8 text-sm" style={{ color: "#9ea096" }}>불러오는 중…</div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {cells.map((dateStr, idx) => {
              if (!dateStr) return <div key={idx} />;
              const day = parseInt(dateStr.slice(8));
              const dow = (firstDow + (day - 1)) % 7;
              const status = scheduleData[dateStr] ?? "working";
              const cfg = statusConfig[status] ?? statusConfig.working;
              const isToday = dateStr === todayStr;
              return (
                <button
                  key={dateStr}
                  onClick={() => toggleScheduleDay(dateStr)}
                  className="rounded-xl py-2 flex flex-col items-center gap-0.5 transition-all active:scale-95"
                  style={{ backgroundColor: cfg.bg }}
                >
                  <span className="text-xs font-bold"
                    style={{
                      color: isToday ? "#F54E00" : dow === 0 ? "#DC2626" : dow === 6 ? "#2563EB" : "#23251d",
                    }}>
                    {isToday ? "오늘" : day}
                  </span>
                  <span className="text-[10px]" style={{ color: cfg.color }}>{cfg.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* 범례 */}
        <div className="flex gap-3 mt-4 justify-center">
          {Object.entries(statusConfig).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5 text-xs" style={{ color: "#65675e" }}>
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cfg.bg, border: `1.5px solid ${cfg.color}` }} />
              {cfg.label}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ── Settlement Tab ──────────────────────────────────────────────────────────
  const SettlementTab = () => {
    if (loadingSettlement) {
      return <div className="text-center py-16 text-sm" style={{ color: "#9ea096" }}>정산 데이터 불러오는 중…</div>;
    }
    if (settlements.length === 0) {
      return (
        <div className="rounded-2xl px-5 py-12 text-center border" style={{ backgroundColor: "#fdfdf8", borderColor: "#bfc1b7" }}>
          <p className="text-base font-semibold mb-1" style={{ color: "#23251d" }}>정산 내역이 없습니다</p>
          <p className="text-sm" style={{ color: "#9ea096" }}>비행을 완료하면 정산 내역이 여기에 표시됩니다.</p>
        </div>
      );
    }
    const statusStyle: Record<SettlementStatus, { label: string; color: string; bg: string; border: string }> = {
      draft:     { label: "집계 중",   color: "#D97706", bg: "#FFFBEB", border: "#FCD34D" },
      confirmed: { label: "정산 확정", color: "#15803D", bg: "#F0FDF4", border: "#86EFAC" },
      paid:      { label: "지급 완료", color: "#23251d", bg: "#eeefe9", border: "#bfc1b7" },
    };

    // 공통 뷰모드 토글
    const ViewToggle = (
      <div className="flex gap-1 mb-4 p-1 rounded-xl" style={{ backgroundColor: "#e5e7e0" }}>
        {(["monthly", "weekly", "daily", "cumulative"] as SettleView[]).map((v) => (
          <button
            key={v}
            onClick={() => setSettleView(v)}
            className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
            style={
              settleView === v
                ? { backgroundColor: "#23251d", color: "#fff" }
                : { color: "#65675e" }
            }
          >
            {v === "monthly" ? "월별" : v === "weekly" ? "주별" : v === "daily" ? "일별" : "누계"}
          </button>
        ))}
      </div>
    );

    // 공통 네비게이터
    function NavRow({
      label, onPrev, onNext, disablePrev, disableNext,
    }: {
      label: string; onPrev: () => void; onNext: () => void;
      disablePrev: boolean; disableNext: boolean;
    }) {
      return (
        <div className="flex items-center justify-between mb-4">
          <button onClick={onPrev} disabled={disablePrev}
            className="w-9 h-9 rounded-xl flex items-center justify-center border disabled:opacity-25"
            style={{ backgroundColor: "#fdfdf8", borderColor: "#bfc1b7" }}>
            <ChevronLeft className="w-4 h-4" style={{ color: "#4d4f46" }} />
          </button>
          <p className="font-bold text-sm" style={{ color: "#23251d" }}>{label}</p>
          <button onClick={onNext} disabled={disableNext}
            className="w-9 h-9 rounded-xl flex items-center justify-center border disabled:opacity-25"
            style={{ backgroundColor: "#fdfdf8", borderColor: "#bfc1b7" }}>
            <ChevronRight className="w-4 h-4" style={{ color: "#4d4f46" }} />
          </button>
        </div>
      );
    }

    // 공통 요약 카드
    function SummaryCard({
      title, total, amount, rate, statusKey, payLabel, payDate, barDays,
    }: {
      title: string; total: number; amount: number; rate: number;
      statusKey: SettlementStatus; payLabel: string; payDate?: string;
      barDays?: SettlementDay[];
    }) {
      const st = statusStyle[statusKey];
      const maxC = Math.max(...(barDays ?? []).map((d) => d.count), 1);
      return (
        <div className="rounded-2xl px-5 py-4 mb-4 border" style={{ backgroundColor: st.bg, borderColor: st.border }}>
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold text-sm" style={{ color: "#23251d" }}>{title}</p>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ backgroundColor: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
              {st.label}
            </span>
          </div>
          <div className="flex items-end gap-2 mb-3">
            <p className="text-3xl font-bold" style={{ color: "#23251d" }}>{formatPrice(amount)}</p>
            <p className="text-sm mb-1" style={{ color: "#9ea096" }}>/ {total}건</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p style={{ color: "#9ea096" }}>단가</p>
              <p className="font-semibold mt-0.5" style={{ color: "#4d4f46" }}>{formatPrice(rate)} / 건</p>
            </div>
            <div>
              <p style={{ color: "#9ea096" }}>{payLabel}</p>
              <p className="font-semibold mt-0.5"
                style={{ color: statusKey === "paid" ? "#15803D" : "#4d4f46" }}>
                {payDate ?? "—"}
              </p>
            </div>
          </div>
          {barDays && barDays.length > 0 && (
            <div className="mt-4">
              <div className="flex items-end gap-0.5 h-10">
                {barDays.map((d) => {
                  const isWknd = d.day === "토" || d.day === "일";
                  return (
                    <div key={d.date} className="flex-1 flex flex-col items-end gap-0.5">
                      <div className="w-full rounded-t"
                        style={{
                          height: `${Math.max((d.count / maxC) * 100, 10)}%`,
                          backgroundColor: isWknd ? "#F54E00" : "#4d4f46",
                        }} />
                      <span className="text-[7px]" style={{ color: "#bfc1b7" }}>{d.date.slice(8)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      );
    }

    // 공통 일별 테이블
    function DayTable({ days, total, amount }: { days: SettlementDay[]; total: number; amount: number }) {
      return (
        <div className="rounded-2xl overflow-hidden mb-4 border" style={{ borderColor: "#bfc1b7" }}>
          <div className="px-5 py-3 border-b flex items-center justify-between"
            style={{ borderColor: "#e5e7e0", backgroundColor: "#fdfdf8" }}>
            <p className="text-sm font-semibold" style={{ color: "#65675e" }}>일별 내역</p>
            <p className="text-xs" style={{ color: "#9ea096" }}>비행일 {days.length}일</p>
          </div>
          <table className="w-full text-sm" style={{ backgroundColor: "#fdfdf8" }}>
            <thead>
              <tr className="border-b" style={{ borderColor: "#e5e7e0" }}>
                <th className="text-left px-5 py-2 text-xs font-medium" style={{ color: "#9ea096" }}>날짜</th>
                <th className="text-center px-3 py-2 text-xs font-medium" style={{ color: "#9ea096" }}>비행</th>
                <th className="text-right px-5 py-2 text-xs font-medium" style={{ color: "#9ea096" }}>소계</th>
              </tr>
            </thead>
            <tbody>
              {days.map((d) => {
                const isWknd = d.day === "토" || d.day === "일";
                return (
                  <tr key={d.date} className="border-b last:border-0" style={{ borderColor: "#e5e7e0" }}>
                    <td className="px-5 py-2.5">
                      <span className="font-medium text-sm"
                        style={{ color: isWknd ? "#F54E00" : "#4d4f46" }}>
                        {d.date.slice(5).replace("-", "/")}
                      </span>
                      <span className="ml-1 text-xs" style={{ color: "#9ea096" }}>({d.day})</span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold"
                        style={{
                          backgroundColor: d.count >= 6 ? "#FEF3C7" : "#eeefe9",
                          color: d.count >= 6 ? "#B45309" : "#4d4f46",
                        }}>
                        {d.count}건
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-right font-semibold text-sm" style={{ color: "#23251d" }}>
                      {formatPrice(d.subtotal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: "#eeefe9" }}>
                <td className="px-5 py-3 font-bold text-sm" style={{ color: "#23251d" }}>합계</td>
                <td className="px-3 py-3 text-center font-bold text-sm" style={{ color: "#23251d" }}>{total}건</td>
                <td className="px-5 py-3 text-right font-bold text-base" style={{ color: "#23251d" }}>{formatPrice(amount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      );
    }

    const notice = (
      <div className="rounded-xl px-4 py-3 text-xs flex items-start gap-2" style={{ backgroundColor: "#eeefe9", color: "#65675e" }}>
        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "#9ea096" }} />
        <span>정산 확정 후 이의가 있으면 관리자에게 연락하세요. 지급일은 익월 첫째 주 토요일 기준입니다.</span>
      </div>
    );

    // ── 월별 뷰 ─────────────────────────────────────────────────────────────
    if (settleView === "monthly") {
      const rec = settlements[settlementMonthIdx];
      if (!rec) return <div className="text-center py-12 text-sm" style={{ color: "#9ea096" }}>정산 데이터가 없습니다</div>;
      const total  = monthTotal(rec);
      const amount = monthAmount(rec);
      return (
        <div>
          {ViewToggle}
          <NavRow
            label={rec.label}
            onPrev={() => setSettlementMonthIdx((i) => i + 1)}
            onNext={() => setSettlementMonthIdx((i) => i - 1)}
            disablePrev={settlementMonthIdx >= settlements.length - 1}
            disableNext={settlementMonthIdx <= 0}
          />
          <SummaryCard
            title="월 정산 요약" total={total} amount={amount} rate={rec.rate}
            statusKey={rec.status}
            payLabel={rec.status === "paid" ? "지급 완료일" : "지급 예정일"}
            payDate={rec.status === "paid" ? rec.paid_at : rec.payment_due}
            barDays={rec.days}
          />
          <DayTable days={rec.days} total={total} amount={amount} />
          {/* 월 이력 퀵 점프 */}
          <div className="rounded-2xl p-4 mb-4 border" style={{ backgroundColor: "#fdfdf8", borderColor: "#bfc1b7" }}>
            <p className="text-xs font-semibold mb-3" style={{ color: "#9ea096" }}>정산 이력</p>
            <div className="space-y-2">
              {settlements.map((m, idx) => {
                const mst = statusStyle[m.status];
                return (
                  <button key={m.month} onClick={() => setSettlementMonthIdx(idx)}
                    className="w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 transition-all"
                    style={{
                      backgroundColor: idx === settlementMonthIdx ? "#eeefe9" : "transparent",
                      border: `1.5px solid ${idx === settlementMonthIdx ? "#bfc1b7" : "transparent"}`,
                    }}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: mst.color }} />
                      <span className="text-sm font-medium" style={{ color: "#23251d" }}>{m.label}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span style={{ color: "#9ea096" }}>{monthTotal(m)}건</span>
                      <span className="font-semibold" style={{ color: "#4d4f46" }}>{formatPrice(monthAmount(m))}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                        style={{ backgroundColor: mst.bg, color: mst.color }}>{mst.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          {notice}
        </div>
      );
    }

    // ── 주별 뷰 ─────────────────────────────────────────────────────────────
    if (settleView === "weekly") {
      const weekKey  = WEEK_KEYS[settleWeekIdx] ?? WEEK_KEYS[0];
      const weekDays = WEEK_MAP[weekKey] ?? [];
      const total    = weekDays.reduce((s, d) => s + d.count, 0);
      const amount   = weekDays.reduce((s, d) => s + d.subtotal, 0);
      const label    = `${weekOrdinalLabel(weekKey)} · ${weekRangeLabel(weekKey)}`;
      // 해당 주의 정산 상태 — 속한 월의 status 로 대리
      const monthOfWeek = weekKey.slice(0, 7);
      const monthRec = settlements.find((m) => m.month === monthOfWeek);
      const weekStatus: SettlementStatus = monthRec?.status ?? "draft";
      const weekPaidLabel = weekStatus === "paid" ? "지급 완료일" : "지급 예정일";
      const weekPayDate   = weekStatus === "paid" ? monthRec?.paid_at : monthRec?.payment_due;
      return (
        <div>
          {ViewToggle}
          <NavRow
            label={label}
            onPrev={() => setSettleWeekIdx((i) => i + 1)}
            onNext={() => setSettleWeekIdx((i) => i - 1)}
            disablePrev={settleWeekIdx >= WEEK_KEYS.length - 1}
            disableNext={settleWeekIdx <= 0}
          />
          <SummaryCard
            title="주간 정산 요약" total={total} amount={amount} rate={settlementRate}
            statusKey={weekStatus}
            payLabel={weekPaidLabel} payDate={weekPayDate}
            barDays={weekDays}
          />
          {weekDays.length > 0
            ? <DayTable days={weekDays} total={total} amount={amount} />
            : <div className="rounded-2xl px-5 py-8 mb-4 text-center border text-sm"
                style={{ backgroundColor: "#fdfdf8", borderColor: "#bfc1b7", color: "#9ea096" }}>
                해당 주에 비행 기록이 없습니다
              </div>
          }
          {notice}
        </div>
      );
    }

    // ── 일별 뷰 ─────────────────────────────────────────────────────────────
    if (settleView === "daily") {
      const day      = ALL_SDAYS[settleDayIdx];
      const isWknd   = day.day === "토" || day.day === "일";
      const dateLabel = `${day.date.slice(0, 4)}년 ${parseInt(day.date.slice(5, 7))}월 ${parseInt(day.date.slice(8))}일 (${day.day})`;
      const monthOfDay  = day.date.slice(0, 7);
      const dayMonthRec = settlements.find((m) => m.month === monthOfDay);
      const dayStatus: SettlementStatus = dayMonthRec?.status ?? "draft";
      // 실제 비행기록 (historyDetailRecords는 selectedHistoryDate 기준으로 로드됨)
      const detailFlights = historyDetailRecords
        .filter((r) => r.flight_date === day.date)
        .map((r, i) => ({
          booking_id:    r.booking_id,
          time_slot:     r.bookings?.flight_time?.slice(0, 5) ?? "--:--",
          customer_name: r.bookings?.customer_name ?? "",
          group_size:    r.bookings?.headcount ?? 1,
          slot_no:       i + 1,
          product_name:  r.bookings?.product_name ?? "",
          options:       Array.isArray(r.bookings?.options)
                           ? (r.bookings!.options as (string | { name: string })[])
                               .map((o) => (typeof o === "string" ? o : o.name))
                           : [],
          landed_at:     r.landing_at ? String(r.landing_at).slice(11, 16) : "--:--",
        }));

      function goToDay(idx: number) {
        setSettleDayIdx(idx);
        setSettleDayShowDetail(false);
      }

      // ── 상세 일정 뷰 ──
      if (settleDayShowDetail) {
        return (
          <div>
            {ViewToggle}
            {/* 뒤로가기 */}
            <button
              onClick={() => setSettleDayShowDetail(false)}
              className="flex items-center gap-1.5 mb-4 text-sm font-semibold"
              style={{ color: "#4d4f46" }}
            >
              <ChevronLeft className="w-4 h-4" />
              일 정산으로
            </button>

            {/* 날짜 요약 */}
            <div className="rounded-2xl px-5 py-4 mb-4 border"
              style={{ backgroundColor: isWknd ? "#FFF7ED" : "#fdfdf8", borderColor: isWknd ? "#FED7AA" : "#bfc1b7" }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-lg" style={{ color: "#23251d" }}>{dateLabel}</p>
                  <p className="text-sm mt-0.5" style={{ color: "#9ea096" }}>비행 {day.count}건</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold" style={{ color: "#23251d" }}>{formatPrice(day.subtotal)}</p>
                  <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: statusStyle[dayStatus].bg,
                      color: statusStyle[dayStatus].color,
                      border: `1px solid ${statusStyle[dayStatus].border}`,
                    }}>
                    {statusStyle[dayStatus].label}
                  </span>
                </div>
              </div>
            </div>

            {/* 비행 카드 목록 */}
            {detailFlights.length > 0 ? (
              <div className="space-y-3">
                {detailFlights.map((f, i) => {
                  const isGroup   = f.group_size > 1;
                  const titleText = isGroup ? `${f.customer_name} 그룹 · ${f.slot_no}번 탠덤` : f.customer_name;
                  return (
                    <div
                      key={`${f.booking_id}-${f.slot_no}-${i}`}
                      className="rounded-2xl p-5 border"
                      style={{ backgroundColor: "#fdfdf8", borderColor: "#bfc1b7" }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="text-center w-14">
                            <p className="text-xl font-bold" style={{ color: "#23251d" }}>{f.time_slot}</p>
                            {isGroup && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                                style={{ backgroundColor: "#FEF3C7", color: "#B45309" }}>
                                #{f.slot_no}탠덤
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-bold" style={{ color: "#23251d" }}>{titleText}</p>
                            <p className="text-sm" style={{ color: "#65675e" }}>
                              {f.product_name}
                              {f.options.length > 0 && (
                                <span style={{ color: "#9ea096" }}> · {f.options.join(", ")}</span>
                              )}
                            </p>
                            {isGroup && (
                              <p className="text-xs mt-0.5" style={{ color: "#9ea096" }}>
                                일행 {f.group_size}명 중 {f.slot_no}번째
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 whitespace-nowrap"
                          style={{ backgroundColor: "#F0FDF4", color: "#15803D", border: "1px solid #BBF7D0" }}>
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          완료
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs mt-1" style={{ color: "#9ea096" }}>
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                        <span>착륙 {f.landed_at} · {f.booking_id}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl px-5 py-8 text-center border text-sm"
                style={{ backgroundColor: "#fdfdf8", borderColor: "#bfc1b7", color: "#9ea096" }}>
                상세 비행 기록이 없습니다
              </div>
            )}
          </div>
        );
      }

      // ── 일 요약 뷰 ──
      return (
        <div>
          {ViewToggle}
          <NavRow
            label={dateLabel}
            onPrev={() => goToDay(settleDayIdx - 1)}
            onNext={() => goToDay(settleDayIdx + 1)}
            disablePrev={settleDayIdx <= 0}
            disableNext={settleDayIdx >= ALL_SDAYS.length - 1}
          />
          {/* 일 요약 카드 — 클릭하면 상세 일정 */}
          <button
            onClick={() => { setSelectedHistoryDate(day.date); setSettleDayShowDetail(true); }}
            className="w-full rounded-2xl px-5 py-4 mb-4 border text-left transition-all active:scale-[0.98]"
            style={{ backgroundColor: isWknd ? "#FFF7ED" : "#fdfdf8", borderColor: isWknd ? "#FED7AA" : "#bfc1b7" }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold mb-2" style={{ color: "#9ea096" }}>일 정산</p>
                <div className="flex items-end gap-2 mb-3">
                  <p className="text-3xl font-bold" style={{ color: "#23251d" }}>{formatPrice(day.subtotal)}</p>
                  <p className="text-sm mb-1" style={{ color: "#9ea096" }}>/ {day.count}건 × {formatPrice(settlementRate)}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p style={{ color: "#9ea096" }}>비행 건수</p>
                    <p className="font-bold mt-0.5 text-base" style={{ color: isWknd ? "#C2410C" : "#23251d" }}>
                      {day.count}건
                      {isWknd && <span className="ml-1 text-xs font-normal" style={{ color: "#9ea096" }}>(주말)</span>}
                    </p>
                  </div>
                  <div>
                    <p style={{ color: "#9ea096" }}>정산 상태</p>
                    <span className="inline-block mt-0.5 text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: statusStyle[dayStatus].bg,
                        color: statusStyle[dayStatus].color,
                        border: `1px solid ${statusStyle[dayStatus].border}`,
                      }}>
                      {statusStyle[dayStatus].label}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center ml-2 mt-1">
                <ChevronRight className="w-5 h-5" style={{ color: "#bfc1b7" }} />
                <span className="text-[9px] mt-0.5 whitespace-nowrap" style={{ color: "#bfc1b7" }}>
                  {detailFlights.length > 0 ? `${detailFlights.length}건` : "상세"}
                </span>
              </div>
            </div>
          </button>

          {/* 최근 비행일 빠른 이동 */}
          <div className="rounded-2xl p-4 mb-4 border" style={{ backgroundColor: "#fdfdf8", borderColor: "#bfc1b7" }}>
            <p className="text-xs font-semibold mb-3" style={{ color: "#9ea096" }}>최근 비행일</p>
            <div className="space-y-1.5">
              {ALL_SDAYS
                .slice(Math.max(0, settleDayIdx - 2), Math.min(ALL_SDAYS.length, settleDayIdx + 3))
                .map((d) => {
                  const isSelected = d.date === day.date;
                  const idx = ALL_SDAYS.indexOf(d);
                  const hasDetail = d.count > 0;
                  return (
                    <button
                      key={d.date}
                      onClick={() => goToDay(idx)}
                      className="w-full flex items-center justify-between rounded-xl px-3 py-2.5 transition-all"
                      style={{
                        backgroundColor: isSelected ? "#eeefe9" : "transparent",
                        border: `1.5px solid ${isSelected ? "#bfc1b7" : "transparent"}`,
                      }}
                    >
                      <span className="text-sm font-medium"
                        style={{ color: (d.day === "토" || d.day === "일") ? "#F54E00" : "#4d4f46" }}>
                        {d.date.slice(5).replace("-", "/")} ({d.day})
                      </span>
                      <div className="flex items-center gap-2 text-xs">
                        <span style={{ color: "#9ea096" }}>{d.count}건</span>
                        <span className="font-semibold" style={{ color: "#23251d" }}>{formatPrice(d.subtotal)}</span>
                        {hasDetail && (
                          <ChevronRight className="w-3.5 h-3.5" style={{ color: "#bfc1b7" }} />
                        )}
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
          {notice}
        </div>
      );
    }

    // ── 누계 뷰 ─────────────────────────────────────────────────────────────
    const filtered = ALL_SDAYS.filter((d) => d.date >= cumulFrom && d.date <= cumulTo);
    const cumulTotal  = filtered.reduce((s, d) => s + d.count, 0);
    const cumulAmount = filtered.reduce((s, d) => s + d.subtotal, 0);
    const flyingDays  = filtered.length;

    // 월별 집계
    const byMonth: Record<string, { count: number; amount: number; label: string }> = {};
    for (const d of filtered) {
      const mKey = d.date.slice(0, 7);
      if (!byMonth[mKey]) {
        const mRec = settlements.find((m) => m.month === mKey);
        byMonth[mKey] = { count: 0, amount: 0, label: mRec?.label ?? mKey };
      }
      byMonth[mKey].count  += d.count;
      byMonth[mKey].amount += d.subtotal;
    }
    const monthEntries = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b));

    return (
      <div>
        {ViewToggle}

        {/* 기간 설정 */}
        <div className="rounded-2xl p-4 mb-4 border" style={{ backgroundColor: "#fdfdf8", borderColor: "#bfc1b7" }}>
          <p className="text-xs font-semibold mb-3" style={{ color: "#9ea096" }}>기간 설정</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-medium mb-1.5" style={{ color: "#9ea096" }}>시작일</p>
              <input
                type="date"
                value={cumulFrom}
                min={ALL_SDAYS[0]?.date}
                max={cumulTo}
                onChange={(e) => setCumulFrom(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                style={{ backgroundColor: "#eeefe9", borderColor: "#bfc1b7", color: "#23251d" }}
              />
            </div>
            <div>
              <p className="text-xs font-medium mb-1.5" style={{ color: "#9ea096" }}>종료일</p>
              <input
                type="date"
                value={cumulTo}
                min={cumulFrom}
                max={ALL_SDAYS[ALL_SDAYS.length - 1]?.date}
                onChange={(e) => setCumulTo(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                style={{ backgroundColor: "#eeefe9", borderColor: "#bfc1b7", color: "#23251d" }}
              />
            </div>
          </div>
          {/* 빠른 선택 버튼 */}
          <div className="flex gap-2 mt-3 flex-wrap">
            {[
              { label: "이번 달",    from: settlements[0]?.days[0]?.date ?? cumulFrom, to: ALL_SDAYS[ALL_SDAYS.length - 1]?.date },
              { label: "최근 3개월", from: settlements[Math.min(settlements.length - 1, 2)]?.days[0]?.date ?? cumulFrom, to: ALL_SDAYS[ALL_SDAYS.length - 1]?.date },
              { label: "전체",      from: ALL_SDAYS[0]?.date, to: ALL_SDAYS[ALL_SDAYS.length - 1]?.date },
            ].map((preset) => (
              <button
                key={preset.label}
                onClick={() => { setCumulFrom(preset.from); setCumulTo(preset.to); }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border"
                style={{ backgroundColor: "#eeefe9", borderColor: "#bfc1b7", color: "#4d4f46" }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* 누계 요약 */}
        <div className="rounded-2xl px-5 py-4 mb-4 border" style={{ backgroundColor: "#23251d", borderColor: "#23251d" }}>
          <p className="text-xs font-semibold mb-2 text-white/60">
            {cumulFrom.slice(5).replace("-", "/")} ~ {cumulTo.slice(5).replace("-", "/")} 누계
          </p>
          <div className="flex items-end gap-2 mb-4">
            <p className="text-3xl font-bold text-white">{formatPrice(cumulAmount)}</p>
            <p className="text-sm mb-1 text-white/50">/ {cumulTotal}건</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "총 비행",   value: `${cumulTotal}건`,                  sub: "" },
              { label: "비행일",    value: `${flyingDays}일`,                  sub: "" },
              { label: "일평균",    value: `${flyingDays > 0 ? (cumulTotal / flyingDays).toFixed(1) : 0}건`, sub: "/일" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl px-3 py-2.5 text-center"
                style={{ backgroundColor: "rgba(255,255,255,0.07)" }}>
                <p className="text-lg font-bold text-white">{s.value}<span className="text-xs text-white/40">{s.sub}</span></p>
                <p className="text-[10px] text-white/50 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 월별 breakdown */}
        {monthEntries.length > 0 && (
          <div className="rounded-2xl overflow-hidden mb-4 border" style={{ borderColor: "#bfc1b7" }}>
            <div className="px-5 py-3 border-b flex items-center justify-between"
              style={{ borderColor: "#e5e7e0", backgroundColor: "#fdfdf8" }}>
              <p className="text-sm font-semibold" style={{ color: "#65675e" }}>월별 내역</p>
              <p className="text-xs" style={{ color: "#9ea096" }}>{monthEntries.length}개월</p>
            </div>
            <table className="w-full text-sm" style={{ backgroundColor: "#fdfdf8" }}>
              <thead>
                <tr className="border-b" style={{ borderColor: "#e5e7e0" }}>
                  <th className="text-left px-5 py-2 text-xs font-medium" style={{ color: "#9ea096" }}>월</th>
                  <th className="text-center px-3 py-2 text-xs font-medium" style={{ color: "#9ea096" }}>비행</th>
                  <th className="text-right px-5 py-2 text-xs font-medium" style={{ color: "#9ea096" }}>소계</th>
                </tr>
              </thead>
              <tbody>
                {monthEntries.map(([mKey, mv]) => {
                  const mRec = settlements.find((m) => m.month === mKey);
                  const mst  = statusStyle[mRec?.status ?? "draft"];
                  const pct  = cumulAmount > 0 ? (mv.amount / cumulAmount) * 100 : 0;
                  return (
                    <tr key={mKey} className="border-b last:border-0" style={{ borderColor: "#e5e7e0" }}>
                      <td className="px-5 py-2.5">
                        <p className="font-medium text-sm" style={{ color: "#23251d" }}>{mv.label}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="h-1 rounded-full flex-1" style={{ backgroundColor: "#e5e7e0" }}>
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: "#4d4f46" }} />
                          </div>
                          <span className="text-[10px]" style={{ color: "#9ea096" }}>{pct.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold"
                          style={{ backgroundColor: "#eeefe9", color: "#4d4f46" }}>
                          {mv.count}건
                        </span>
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        <p className="font-semibold text-sm" style={{ color: "#23251d" }}>{formatPrice(mv.amount)}</p>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: mst.bg, color: mst.color }}>
                          {mst.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: "#eeefe9" }}>
                  <td className="px-5 py-3 font-bold text-sm" style={{ color: "#23251d" }}>합계</td>
                  <td className="px-3 py-3 text-center font-bold text-sm" style={{ color: "#23251d" }}>{cumulTotal}건</td>
                  <td className="px-5 py-3 text-right font-bold text-base" style={{ color: "#23251d" }}>{formatPrice(cumulAmount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        {filtered.length === 0 && (
          <div className="rounded-2xl px-5 py-8 mb-4 text-center border text-sm"
            style={{ backgroundColor: "#fdfdf8", borderColor: "#bfc1b7", color: "#9ea096" }}>
            선택한 기간에 비행 기록이 없습니다
          </div>
        )}
        {notice}
      </div>
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  // ── 스케줄 상태 토글 (work→off→standby→work)
  async function toggleScheduleDay(date: string) {
    if (!pilotId) return;
    const cur = scheduleData[date] ?? "working";
    // "etc"(기타) 또는 알 수 없는 상태는 "working"으로 정규화 후 토글
    const normalized = cur === "off" || cur === "standby" ? cur : "working";
    const next = normalized === "working" ? "off" : normalized === "off" ? "standby" : "working";
    setScheduleData((prev) => ({ ...prev, [date]: next }));
    try {
      await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pilotId, date, status: next }),
      });
    } catch (err) {
      console.error("스케줄 업데이트 실패:", err);
      // 실패 시 원복
      setScheduleData((prev) => ({ ...prev, [date]: cur }));
    }
  }

  const tabItems = [
    { key: "today" as const,      label: "오늘 일정", icon: <CalendarDays className="w-4 h-4" /> },
    { key: "history" as const,    label: "비행기록",  icon: <BookOpen className="w-4 h-4" /> },
    { key: "settlement" as const, label: "정산",      icon: <Calculator className="w-4 h-4" /> },
    { key: "schedule" as const,   label: "스케줄",    icon: <LayoutGrid className="w-4 h-4" /> },
  ] as const;

  const pilotName    = pilotInfo?.name ?? "파일럿";
  const licenseExpiry = pilotInfo?.license_expiry ?? "";

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col" style={{ backgroundColor: "#eeefe9" }}>
      {/* 헤더 */}
      <div className="px-5 pt-8 pb-5" style={{ backgroundColor: "#23251d" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wind className="w-5 h-5" style={{ color: "#F54E00" }} />
            <span className="text-white font-bold">구름상회</span>
          </div>
          <button
            onClick={() => {
              if (confirm(`${pilotName} 파일럿으로 로그인 중입니다.\n로그아웃하시겠습니까?`)) {
                fetch("/api/pilot/logout", { method: "POST" })
                  .finally(() => router.replace("/pilot/login"));
              }
            }}
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white transition-opacity active:opacity-70"
            style={{ backgroundColor: "#4d4f46" }}
            title="로그아웃"
          >
            {pilotName[0]}
          </button>
        </div>
        <div>
          <p className="text-white/60 text-sm">{today}</p>
          <h1 className="text-white text-2xl font-bold mt-0.5">{pilotName} 파일럿</h1>
          {licenseExpiry && (
            <p className="text-white/40 text-xs mt-1">자격증 만료 {licenseExpiry}</p>
          )}
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
            onClick={() => {
              setTab(t.key);
              setSelectedHistoryDate(null);
            }}
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
        {tab === "schedule"   && <ScheduleTab />}
      </div>
    </div>
  );
}
