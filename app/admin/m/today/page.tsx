"use client";

/**
 * 모바일 어드민 — 오늘(또는 임의 날짜) 배정 보드.
 *
 * 디자인 결정:
 *  - 상단 토글: 오늘 / 내일 / 임의 날짜(가로 스와이프 14일)
 *  - 빨간 배너 (있다면): pending_admin_review 카운트
 *  - 시간 슬롯별 그룹: 슬롯 헤더 + 예약 카드 (배정된 파일럿 chip 리스트)
 *  - 여유 파일럿 섹션: 그날 가용 파일럿 중 어떤 슬롯에도 안 들어간 사람
 *  - 카드 탭 → `/admin/m/bookings/[id]` (PR-4에서 구현)
 *  - 60초 자동 새로고침
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  AlertTriangle,
  RefreshCw,
  Plane,
  Users,
  CheckCircle2,
  Hand,
  Wrench,
  ChevronRight,
} from "lucide-react";

// ─── 타입 ─────────────────────────────────────────────────────────

interface PilotChip {
  id: string;
  name: string;
}
interface BookingPilotRow {
  slot_no: number;
  pilot_id: string;
  assigned_flight_time?: string | null;
  pilots: { id: string; name: string } | null;
}
interface BookingRow {
  id: string;
  booking_no: string;
  customer_name: string;
  customer_phone: string;
  product_name: string;
  headcount: number;
  flight_date: string;
  flight_time: string;
  status: string;
  assignment_status: "auto" | "manual" | "pending_admin_review" | null;
  booking_pilots: BookingPilotRow[];
}
interface PilotRow {
  id: string;
  name: string;
  status?: string;
}
interface ScheduleEntry {
  // /api/schedules 반환 형식: { pilotId: { "YYYY-MM-DD": "working"|"off"|... } }
  [pilotId: string]: Record<string, string>;
}

// ─── 유틸 ─────────────────────────────────────────────────────────

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function offsetISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function formatKoDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getMonth() + 1}/${d.getDate()} (${days[d.getDay()]})`;
}
function yearMonthOf(iso: string): string {
  return iso.slice(0, 7);
}

// 상태별 표시 정보
const STATUS_INFO: Record<string, { label: string; bg: string; fg: string }> = {
  auto: { label: "자동", bg: "#ECFDF5", fg: "#047857" },
  manual: { label: "수동", bg: "#FFF7ED", fg: "#C2410C" },
  pending_admin_review: { label: "수동필요", bg: "#FEE2E2", fg: "#B91C1C" },
};

// ─── 페이지 ───────────────────────────────────────────────────────

export default function TodayBoardPage() {
  const searchParams = useSearchParams();
  const initialDate = searchParams.get("date") || todayISO();

  const [date, setDate] = useState<string>(initialDate);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [pilots, setPilots] = useState<PilotRow[]>([]);
  const [schedules, setSchedules] = useState<ScheduleEntry>({});
  // 큐 인덱스 (0 = 다음 차례). pilot_id → queue_idx
  const [queueIdx, setQueueIdx] = useState<Record<string, number>>({});
  // effective 기본 순번 (참고용 표시). pilot_id → effective_order
  const [effectiveOrders, setEffectiveOrders] = useState<Record<string, number>>({});
  const [hasOverride, setHasOverride] = useState(false);
  // 마지막 배정자 정보
  const [lastAssigned, setLastAssigned] = useState<{ name: string | null; at: string | null }>({
    name: null,
    at: null,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const ym = yearMonthOf(date);
      const [bRes, pRes, sRes, qRes] = await Promise.all([
        fetch(`/api/bookings?date=${date}`, { cache: "no-store" }),
        fetch(`/api/pilots`, { cache: "no-store" }),
        fetch(`/api/schedules?year_month=${ym}`, { cache: "no-store" }),
        fetch(`/api/admin/pilots/rotation/queue?date=${date}`, { cache: "no-store" }),
      ]);
      const bJson: BookingRow[] = bRes.ok ? await bRes.json() : [];
      const pJson: PilotRow[] = pRes.ok ? await pRes.json() : [];
      const sJson: ScheduleEntry = sRes.ok ? await sRes.json() : {};
      const qJson = qRes.ok
        ? await qRes.json()
        : {
            pilots: [],
            has_override: false,
            last_assigned_name: null,
            last_assigned_at: null,
          };

      // 취소된 예약은 보드에서 숨김
      setBookings(bJson.filter((b) => b.status !== "cancelled"));
      setPilots(pJson.filter((p) => !p.status || p.status === "active"));
      setSchedules(sJson);

      const qMap: Record<string, number> = {};
      const effMap: Record<string, number> = {};
      for (const p of (qJson.pilots ?? []) as Array<{
        id: string;
        queue_idx: number;
        effective_order: number | null;
      }>) {
        qMap[p.id] = p.queue_idx;
        if (p.effective_order != null) effMap[p.id] = p.effective_order;
      }
      setQueueIdx(qMap);
      setEffectiveOrders(effMap);
      setHasOverride(!!qJson.has_override);
      setLastAssigned({
        name: qJson.last_assigned_name ?? null,
        at: qJson.last_assigned_at ?? null,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [date]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // 60초 자동 새로고침
  useEffect(() => {
    const tid = setInterval(() => load(), 60 * 1000);
    return () => clearInterval(tid);
  }, [load]);

  // ── 파생 ──────────────────────────────────────────────────────────

  // 시간 슬롯별로 묶기 (HH:MM 키 오름차순)
  const byTime = useMemo(() => {
    const map = new Map<string, BookingRow[]>();
    for (const b of bookings) {
      const key = b.flight_time?.slice(0, 5) ?? "??:??";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [bookings]);

  // pending 카운트
  const pendingCount = useMemo(
    () => bookings.filter((b) => b.assignment_status === "pending_admin_review").length,
    [bookings],
  );

  // 여유 파일럿 (그날 가용 풀 ∖ 그날 어떤 booking_pilots에라도 들어간 사람)
  // 정렬: 큐 인덱스 오름차순 (queue_idx=0 이 자동 배정의 다음 후보) → 동률은 effective_order → 이름
  const idleP = useMemo(() => {
    const unavailable = new Set<string>();
    for (const [pid, days] of Object.entries(schedules)) {
      const v = days[date];
      if (v === "off" || v === "etc") unavailable.add(pid);
    }
    const busy = new Set<string>();
    for (const b of bookings) {
      for (const bp of b.booking_pilots ?? []) busy.add(bp.pilot_id);
    }
    const list = pilots.filter((p) => !unavailable.has(p.id) && !busy.has(p.id));
    list.sort((a, b) => {
      const aq = queueIdx[a.id] ?? Number.MAX_SAFE_INTEGER;
      const bq = queueIdx[b.id] ?? Number.MAX_SAFE_INTEGER;
      if (aq !== bq) return aq - bq;
      const ao = effectiveOrders[a.id] ?? Number.MAX_SAFE_INTEGER;
      const bo = effectiveOrders[b.id] ?? Number.MAX_SAFE_INTEGER;
      if (ao !== bo) return ao - bo;
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [pilots, schedules, bookings, date, queueIdx, effectiveOrders]);

  // 합계 인원
  const totalHeadcount = bookings.reduce((s, b) => s + (b.headcount || 0), 0);

  // ── 액션 ──────────────────────────────────────────────────────────

  function handleRefresh() {
    setRefreshing(true);
    load();
  }

  // ── 렌더 ──────────────────────────────────────────────────────────

  const isToday = date === todayISO();
  const isTomorrow = date === offsetISO(1);

  return (
    <div className="flex flex-col w-full flex-1">
      {/* 상단 헤더 */}
      <header className="px-5 pt-4 pb-3 flex items-center gap-2">
        <Link
          href="/admin/m"
          className="w-11 h-11 rounded-full bg-white shadow-sm flex items-center justify-center active:scale-95 transition"
          aria-label="뒤로"
        >
          <ArrowLeft size={20} style={{ color: "#0D2B52" }} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="text-lg font-bold" style={{ color: "#0D2B52" }}>
            배정 보드
          </div>
          <div className="text-xs" style={{ color: "#65675e" }}>
            {formatKoDate(date)}
            {isToday ? " · 오늘" : isTomorrow ? " · 내일" : ""}
            {loading ? " · 불러오는 중…" : ` · ${bookings.length}건 · ${totalHeadcount}명`}
          </div>
        </div>
        <button
          type="button"
          aria-label="새로고침"
          onClick={handleRefresh}
          className="w-11 h-11 rounded-full bg-white shadow-sm flex items-center justify-center active:scale-95 transition"
        >
          <RefreshCw
            size={20}
            className={refreshing ? "animate-spin" : ""}
            style={{ color: "#0D2B52" }}
          />
        </button>
      </header>

      {/* 날짜 토글 — 14일 가로 스크롤 */}
      <div className="-mx-0 px-5 overflow-x-auto">
        <div className="flex gap-2 pb-2 w-max">
          {Array.from({ length: 14 }, (_, i) => offsetISO(i)).map((iso) => {
            const sel = date === iso;
            const d = new Date(iso + "T00:00:00");
            const wd = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
            const isT = iso === todayISO();
            return (
              <button
                key={iso}
                type="button"
                onClick={() => setDate(iso)}
                className="px-3 py-2 rounded-xl text-center transition active:scale-95 shrink-0"
                style={{
                  backgroundColor: sel ? "#0D2B52" : "white",
                  color: sel ? "white" : "#4d4f46",
                  border: `1px solid ${sel ? "#0D2B52" : "#E5E7EB"}`,
                  minWidth: 56,
                }}
              >
                <div className="text-[10px] font-medium" style={{ opacity: 0.7 }}>
                  {wd}
                  {isT ? "·오늘" : ""}
                </div>
                <div className="text-sm font-bold mt-0.5">
                  {d.getMonth() + 1}/{d.getDate()}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* pending 빨간 배너 */}
      {pendingCount > 0 && (
        <div className="px-5 mt-2">
          <div
            className="rounded-xl p-3 flex items-start gap-2"
            style={{ backgroundColor: "#FEF2F2", border: "1px solid #FCA5A5" }}
          >
            <AlertTriangle size={18} style={{ color: "#B91C1C" }} className="shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold" style={{ color: "#B91C1C" }}>
                수동 배정 필요 {pendingCount}건
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: "#7F1D1D" }}>
                영업종료까지 자리를 못 찾은 예약입니다. 카드 탭해서 처리하세요.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 시간 슬롯별 그룹 */}
      <div className="px-5 mt-3 space-y-4 pb-8">
        {loading && (
          <div className="text-sm text-center py-8" style={{ color: "#9ea096" }}>
            불러오는 중…
          </div>
        )}

        {!loading && bookings.length === 0 && (
          <div
            className="rounded-2xl p-6 text-center"
            style={{ backgroundColor: "white", border: "1px dashed #E5E7EB" }}
          >
            <div className="text-sm font-semibold" style={{ color: "#65675e" }}>
              {formatKoDate(date)}에 예약이 없습니다.
            </div>
            <Link
              href="/admin/m/new"
              className="inline-block mt-3 px-4 py-2 rounded-xl text-sm font-bold text-white"
              style={{ backgroundColor: "#0D2B52" }}
            >
              전화 예약 받기
            </Link>
          </div>
        )}

        {!loading &&
          byTime.map(([time, list]) => (
            <div key={time}>
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="px-2.5 py-1 rounded-md text-sm font-bold"
                  style={{ backgroundColor: "#0D2B52", color: "white" }}
                >
                  {time}
                </div>
                <div className="text-xs" style={{ color: "#65675e" }}>
                  {list.length}건 ·{" "}
                  {list.reduce((s, b) => s + (b.headcount || 0), 0)}명
                </div>
              </div>
              <div className="space-y-2">
                {list.map((b) => (
                  <BookingCard key={b.id} booking={b} />
                ))}
              </div>
            </div>
          ))}

        {/* 여유 파일럿 */}
        {!loading && idleP.length > 0 && (
          <div>
            <div className="flex items-center justify-between mt-6 mb-2 gap-2">
              <div className="flex items-center gap-2">
                <Hand size={16} style={{ color: "#F97316" }} />
                <div className="text-sm font-bold" style={{ color: "#0D2B52" }}>
                  여유 파일럿 {idleP.length}명
                </div>
              </div>
              {hasOverride && (
                <span
                  className="px-2 py-0.5 rounded-md text-[10px] font-bold"
                  style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}
                >
                  오늘 순번 오버라이드
                </span>
              )}
            </div>
            <div
              className="rounded-2xl p-3 bg-white"
              style={{ border: "1px dashed #FED7AA" }}
            >
              <div className="text-[11px] mb-2" style={{ color: "#65675e" }}>
                위에서부터 <strong style={{ color: "#9A3412" }}>다음 자동 배정 후보</strong>입니다 (라운드로빈 큐 기준, 어제부터 이어집니다).
                {lastAssigned.name && (
                  <>
                    {" "}마지막 배정: <strong>{lastAssigned.name}</strong>.
                  </>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {idleP.map((p, i) => {
                  const ord = effectiveOrders[p.id];
                  const isNext = i === 0;
                  return (
                    <span
                      key={p.id}
                      className="px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1"
                      style={{
                        backgroundColor: isNext ? "#9A3412" : "#FFF7ED",
                        color: isNext ? "white" : "#9A3412",
                        border: isNext ? "none" : "1px solid #FED7AA",
                      }}
                    >
                      {isNext ? (
                        <span
                          className="px-1 rounded text-[9px] font-bold"
                          style={{ backgroundColor: "white", color: "#9A3412" }}
                        >
                          NEXT
                        </span>
                      ) : (
                        ord != null && (
                          <span
                            className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                            style={{ backgroundColor: "#9A3412", color: "white" }}
                          >
                            {ord}
                          </span>
                        )
                      )}
                      {p.name}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 예약 카드 ──────────────────────────────────────────────────────

function BookingCard({ booking }: { booking: BookingRow }) {
  const status = booking.assignment_status ?? "auto";
  const info = STATUS_INFO[status] ?? STATUS_INFO.auto;

  // 배정 파일럿: booking_pilots를 slot_no 순으로
  const sortedPilots = [...(booking.booking_pilots ?? [])].sort(
    (a, b) => a.slot_no - b.slot_no,
  );
  // 이월 여부 (assigned_flight_time이 booking.flight_time과 다른 경우)
  const requestedTime = booking.flight_time?.slice(0, 5) ?? "";
  const hasSpillover = sortedPilots.some(
    (bp) =>
      bp.assigned_flight_time &&
      bp.assigned_flight_time.slice(0, 5) !== requestedTime,
  );

  const isPending = status === "pending_admin_review";
  const isManual = status === "manual";

  return (
    <Link
      href={`/admin/m/bookings/${booking.id}`}
      className="block rounded-2xl p-3 bg-white active:scale-[0.99] transition shadow-sm"
      style={{
        border: `1.5px solid ${isPending ? "#FCA5A5" : "#E5E7EB"}`,
      }}
    >
      {/* 1행: 고객명/인원 + 상태 chip */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-base font-bold" style={{ color: "#0D2B52" }}>
              {booking.customer_name}
            </span>
            <span className="text-xs" style={{ color: "#65675e" }}>
              {booking.product_name} × {booking.headcount}명
            </span>
          </div>
          <div className="text-[11px] mt-0.5 font-mono" style={{ color: "#9ea096" }}>
            {booking.booking_no}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-0.5"
            style={{ backgroundColor: info.bg, color: info.fg }}
          >
            {isPending ? (
              <AlertTriangle size={10} />
            ) : isManual ? (
              <Wrench size={10} />
            ) : (
              <CheckCircle2 size={10} />
            )}
            {info.label}
          </span>
          <ChevronRight size={16} style={{ color: "#9ea096" }} />
        </div>
      </div>

      {/* 2행: 배정 파일럿 */}
      {sortedPilots.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {sortedPilots.map((bp) => {
            const t = bp.assigned_flight_time?.slice(0, 5);
            const spilled = !!t && t !== requestedTime;
            return (
              <span
                key={`${bp.slot_no}-${bp.pilot_id}`}
                className="px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1"
                style={{
                  backgroundColor: spilled ? "#FFFBEB" : "#F3F4F6",
                  color: spilled ? "#B45309" : "#0D2B52",
                  border: spilled ? "1px solid #FCD34D" : "1px solid transparent",
                }}
              >
                <span className="font-bold">#{bp.slot_no}</span>
                <span>{bp.pilots?.name ?? "—"}</span>
                {spilled && t && (
                  <span className="flex items-center gap-0.5">
                    <Plane size={10} />
                    {t}
                  </span>
                )}
              </span>
            );
          })}
          {hasSpillover && (
            <span
              className="px-2 py-1 rounded-md text-[10px] font-bold"
              style={{ backgroundColor: "#FFFBEB", color: "#92400E" }}
            >
              이월 발생
            </span>
          )}
        </div>
      ) : (
        <div className="mt-2 flex items-center gap-1 text-[11px]" style={{ color: "#B91C1C" }}>
          <Users size={12} />
          파일럿 미배정
        </div>
      )}
    </Link>
  );
}
