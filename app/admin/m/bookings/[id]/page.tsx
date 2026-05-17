"use client";

/**
 * 모바일 어드민 — 단일 예약 상세 + 재배정.
 *
 * 디자인 결정:
 *  - 상단: 예약 요약 카드 + 전화 걸기 버튼(`tel:`)
 *  - 배정 슬롯별 카드: [교체] [해제] 버튼
 *      - [교체] → BottomSheet에서 "이 시각 가용 파일럿" 표시 (당일 비행수 오름차순)
 *      - [해제] → 확인 후 DELETE + bookings.assignment_status='manual'
 *  - 하단: [자동 재배정 다시 돌리기]
 *  - 모든 수동 조작 후 → bookings.assignment_status='manual' 전환
 *  - 30초 자동 새로고침
 */

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Phone,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  RefreshCw,
  Plane,
  Repeat2,
  Trash2,
  MessageSquare,
  Wand2,
} from "lucide-react";
import BottomSheet from "@/components/mobile/BottomSheet";

// ─── 타입 ─────────────────────────────────────────────────────────

interface BookingPilotRow {
  id: string;
  slot_no: number;
  pilot_id: string;
  assigned_flight_time: string | null;
  pilots: { id: string; name: string } | null;
}

interface BookingDetail {
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
  memo: string | null;
  total_price: number;
  deposit_amount: number;
  balance_amount: number;
  channel: string | null;
  booking_pilots: BookingPilotRow[];
}

interface PilotRow {
  id: string;
  name: string;
  status?: string;
}

// ─── 유틸 ─────────────────────────────────────────────────────────

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function formatKoDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}
function yearMonthOf(iso: string): string {
  return iso?.slice(0, 7) ?? "";
}
function formatPrice(n: number) {
  return (n ?? 0).toLocaleString("ko-KR") + "원";
}

// 상태 chip 정보
const STATUS_INFO: Record<string, { label: string; bg: string; fg: string; Icon: typeof CheckCircle2 }> = {
  auto:                    { label: "자동 배정", bg: "#ECFDF5", fg: "#047857", Icon: CheckCircle2 },
  manual:                  { label: "수동 조정", bg: "#FFF7ED", fg: "#C2410C", Icon: Wrench },
  pending_admin_review:    { label: "수동 배정 필요", bg: "#FEE2E2", fg: "#B91C1C", Icon: AlertTriangle },
};

// ─── 페이지 ───────────────────────────────────────────────────────

export default function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [allPilots, setAllPilots] = useState<PilotRow[]>([]);
  // 같은 날 다른 예약들 (시각별 점유 계산용)
  const [sameDateBookings, setSameDateBookings] = useState<
    Array<{ id: string; booking_pilots: BookingPilotRow[] }>
  >([]);
  // 그날 휴무·기타인 파일럿 ID
  const [unavailablePilots, setUnavailablePilots] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [bannerMsg, setBannerMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // 교체 시트 상태
  const [swapTarget, setSwapTarget] = useState<BookingPilotRow | null>(null);

  // 자동 재배정 결과 시트
  const [reassignResult, setReassignResult] = useState<{
    kind: "ok" | "exhausted";
    shortage?: number;
  } | null>(null);

  // ── 로드 ──────────────────────────────────────────────────────────
  const load = useCallback(
    async (showSpinner = false) => {
      if (showSpinner) setLoading(true);
      try {
        const r = await fetch(`/api/bookings/${id}`, { cache: "no-store" });
        if (!r.ok) {
          setBooking(null);
          return;
        }
        const b = (await r.json()) as BookingDetail;
        setBooking(b);

        if (b.flight_date) {
          const ym = yearMonthOf(b.flight_date);
          const [pRes, sRes, dRes] = await Promise.all([
            fetch(`/api/pilots`, { cache: "no-store" }),
            fetch(`/api/schedules?year_month=${ym}`, { cache: "no-store" }),
            fetch(`/api/bookings?date=${b.flight_date}`, { cache: "no-store" }),
          ]);
          const pilots: PilotRow[] = pRes.ok ? await pRes.json() : [];
          const sJson = sRes.ok ? await sRes.json() : {};
          const dList = dRes.ok ? await dRes.json() : [];
          setAllPilots(pilots.filter((p) => !p.status || p.status === "active"));

          const off = new Set<string>();
          for (const [pid, days] of Object.entries(sJson as Record<string, Record<string, string>>)) {
            const v = days[b.flight_date];
            if (v === "off" || v === "etc") off.add(pid);
          }
          setUnavailablePilots(off);

          setSameDateBookings(
            (dList as Array<{ id: string; booking_pilots: BookingPilotRow[]; status: string }>)
              .filter((x) => x.status !== "cancelled")
              .map((x) => ({ id: x.id, booking_pilots: x.booking_pilots ?? [] })),
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    load(true);
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => load(false), 30 * 1000);
    return () => clearInterval(t);
  }, [load]);

  // ── 액션 ──────────────────────────────────────────────────────────

  function showOk(text: string) {
    setBannerMsg({ kind: "ok", text });
    setTimeout(() => setBannerMsg(null), 3000);
  }
  function showErr(text: string) {
    setBannerMsg({ kind: "err", text });
    setTimeout(() => setBannerMsg(null), 5000);
  }

  async function markManual() {
    await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignment_status: "manual" }),
    });
  }

  async function handleRelease(bp: BookingPilotRow) {
    if (!booking) return;
    const pilotName = bp.pilots?.name ?? "이 파일럿";
    if (!confirm(`#${bp.slot_no} ${pilotName} 배정을 해제하시겠어요?`)) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/booking-pilots`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: booking.id, pilot_id: bp.pilot_id }),
      });
      if (!r.ok) throw new Error("해제 실패");
      await markManual();
      await load(false);
      showOk(`${pilotName} 해제 완료`);
    } catch (e: unknown) {
      showErr(e instanceof Error ? e.message : "해제 실패");
    } finally {
      setBusy(false);
    }
  }

  async function handleSwap(newPilot: PilotRow) {
    if (!booking || !swapTarget) return;
    if (newPilot.id === swapTarget.pilot_id) {
      setSwapTarget(null);
      return;
    }
    setBusy(true);
    try {
      // 1) 기존 파일럿 해제
      const delRes = await fetch(`/api/booking-pilots`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: booking.id, pilot_id: swapTarget.pilot_id }),
      });
      if (!delRes.ok) throw new Error("기존 배정 해제 실패");

      // 2) 새 파일럿 배정 (같은 slot_no + assigned_flight_time 유지)
      const postRes = await fetch(`/api/booking-pilots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: booking.id,
          pilot_id: newPilot.id,
          slot_no: swapTarget.slot_no,
          assigned_flight_time: swapTarget.assigned_flight_time ?? booking.flight_time,
        }),
      });
      if (!postRes.ok) throw new Error("새 파일럿 배정 실패");

      await markManual();
      await load(false);
      setSwapTarget(null);
      showOk(`#${swapTarget.slot_no} 교체 완료: ${newPilot.name}`);
    } catch (e: unknown) {
      showErr(e instanceof Error ? e.message : "교체 실패");
    } finally {
      setBusy(false);
    }
  }

  async function handleAutoReassign() {
    if (!booking) return;
    if (
      !confirm(
        "기존 배정을 모두 지우고 자동 배정을 다시 돌립니다. 진행하시겠어요?",
      )
    )
      return;
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/booking-pilots/auto-assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: booking.id }),
      });
      const j = await r.json().catch(() => ({}));
      await load(false);
      if (r.status === 409) {
        setReassignResult({ kind: "exhausted", shortage: j?.shortage ?? 0 });
      } else if (!r.ok) {
        showErr(j?.error ?? "자동 재배정 실패");
      } else {
        setReassignResult({ kind: "ok" });
      }
    } catch (e: unknown) {
      showErr(e instanceof Error ? e.message : "자동 재배정 실패");
    } finally {
      setBusy(false);
    }
  }

  // ── 파생: 교체 시트용 가용 파일럿 ─────────────────────────────────
  const candidates = useMemo(() => {
    if (!swapTarget || !booking) return [];
    const slotTime = swapTarget.assigned_flight_time ?? booking.flight_time;
    // 그 시각에 다른 예약(같은 booking 포함)에서 이미 배정된 파일럿
    const busyAtSlot = new Set<string>();
    for (const sb of sameDateBookings) {
      for (const bp of sb.booking_pilots ?? []) {
        if ((bp.assigned_flight_time ?? booking.flight_time) === slotTime) {
          busyAtSlot.add(bp.pilot_id);
        }
      }
    }
    // 교체 대상 자신은 어차피 해제 후 들어가므로 풀에서 제외
    busyAtSlot.delete(swapTarget.pilot_id);

    // 그날 비행 횟수 (균등 분배 정렬용)
    const flightCount: Record<string, number> = {};
    for (const sb of sameDateBookings) {
      for (const bp of sb.booking_pilots ?? []) {
        flightCount[bp.pilot_id] = (flightCount[bp.pilot_id] ?? 0) + 1;
      }
    }

    const eligible = allPilots.filter(
      (p) => !unavailablePilots.has(p.id) && !busyAtSlot.has(p.id),
    );
    eligible.sort((a, b) => {
      const af = flightCount[a.id] ?? 0;
      const bf = flightCount[b.id] ?? 0;
      if (af !== bf) return af - bf;
      return a.name.localeCompare(b.name);
    });
    return eligible.map((p) => ({
      ...p,
      todayFlights: flightCount[p.id] ?? 0,
    }));
  }, [swapTarget, booking, sameDateBookings, allPilots, unavailablePilots]);

  // ── 렌더 ──────────────────────────────────────────────────────────

  const phoneTel = booking?.customer_phone?.replace(/\D/g, "") ?? "";
  const sortedPilots = useMemo(
    () => [...(booking?.booking_pilots ?? [])].sort((a, b) => a.slot_no - b.slot_no),
    [booking],
  );
  const requestedTime = booking?.flight_time?.slice(0, 5) ?? "";

  if (loading && !booking) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <div className="text-sm" style={{ color: "#9ea096" }}>불러오는 중…</div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="px-5 pt-6">
        <Link href="/admin/m/today" className="text-sm underline" style={{ color: "#0D2B52" }}>
          ← 보드로 돌아가기
        </Link>
        <div className="mt-6 text-base font-bold" style={{ color: "#B91C1C" }}>
          예약을 찾을 수 없습니다.
        </div>
      </div>
    );
  }

  const statusKey = booking.assignment_status ?? "auto";
  const statusInfo = STATUS_INFO[statusKey] ?? STATUS_INFO.auto;
  const StatusIcon = statusInfo.Icon;

  return (
    <div className="flex flex-col w-full flex-1 pb-8">
      {/* 상단 헤더 */}
      <header className="px-5 pt-4 pb-3 flex items-center gap-2">
        <Link
          href="/admin/m/today"
          className="w-11 h-11 rounded-full bg-white shadow-sm flex items-center justify-center active:scale-95 transition"
          aria-label="뒤로"
        >
          <ArrowLeft size={20} style={{ color: "#0D2B52" }} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="text-lg font-bold" style={{ color: "#0D2B52" }}>
            예약 상세
          </div>
          <div className="text-xs font-mono" style={{ color: "#65675e" }}>
            {booking.booking_no}
          </div>
        </div>
        <button
          type="button"
          aria-label="새로고침"
          onClick={() => load(true)}
          className="w-11 h-11 rounded-full bg-white shadow-sm flex items-center justify-center active:scale-95 transition"
        >
          <RefreshCw size={20} style={{ color: "#0D2B52" }} className={loading ? "animate-spin" : ""} />
        </button>
      </header>

      {/* 작업 결과 배너 */}
      {bannerMsg && (
        <div className="px-5 mb-2">
          <div
            className="rounded-xl p-2.5 text-sm font-semibold"
            style={{
              backgroundColor: bannerMsg.kind === "ok" ? "#ECFDF5" : "#FEF2F2",
              color: bannerMsg.kind === "ok" ? "#047857" : "#B91C1C",
            }}
          >
            {bannerMsg.text}
          </div>
        </div>
      )}

      {/* 예약 요약 카드 */}
      <section className="px-5">
        <div className="rounded-2xl bg-white p-4 shadow-sm" style={{ border: "1px solid #E5E7EB" }}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-base font-bold" style={{ color: "#0D2B52" }}>
                {booking.customer_name}
              </div>
              <div className="text-xs mt-0.5" style={{ color: "#65675e" }}>
                {booking.product_name} × {booking.headcount}명
              </div>
            </div>
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-0.5 shrink-0"
              style={{ backgroundColor: statusInfo.bg, color: statusInfo.fg }}
            >
              <StatusIcon size={10} />
              {statusInfo.label}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div>
              <div style={{ color: "#9ea096" }}>일자</div>
              <div className="font-semibold" style={{ color: "#0D2B52" }}>
                {formatKoDate(booking.flight_date)}
              </div>
            </div>
            <div>
              <div style={{ color: "#9ea096" }}>시각</div>
              <div className="font-semibold" style={{ color: "#0D2B52" }}>
                {booking.flight_time?.slice(0, 5)}
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <a
              href={`tel:${phoneTel}`}
              className="flex-1 h-10 rounded-xl flex items-center justify-center gap-2 font-bold text-sm text-white active:scale-[0.99]"
              style={{ backgroundColor: "#0D2B52" }}
            >
              <Phone size={16} /> {booking.customer_phone || "연락처 없음"}
            </a>
          </div>

          {booking.memo && (
            <div
              className="mt-3 p-2.5 rounded-lg text-xs"
              style={{ backgroundColor: "#FFFBEB", color: "#92400E" }}
            >
              <div className="flex items-start gap-1.5">
                <MessageSquare size={12} className="mt-0.5 shrink-0" />
                <div className="whitespace-pre-wrap">{booking.memo}</div>
              </div>
            </div>
          )}

          <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
            <div className="rounded-lg p-2" style={{ backgroundColor: "#F9FAFB" }}>
              <div style={{ color: "#9ea096" }}>총액</div>
              <div className="font-bold mt-0.5" style={{ color: "#0D2B52" }}>
                {formatPrice(booking.total_price)}
              </div>
            </div>
            <div className="rounded-lg p-2" style={{ backgroundColor: "#EFF6FF" }}>
              <div style={{ color: "#2A7AE2" }}>예약금</div>
              <div className="font-bold mt-0.5" style={{ color: "#2A7AE2" }}>
                {formatPrice(booking.deposit_amount)}
              </div>
            </div>
            <div className="rounded-lg p-2" style={{ backgroundColor: "#F9FAFB" }}>
              <div style={{ color: "#9ea096" }}>잔금</div>
              <div className="font-bold mt-0.5" style={{ color: "#65675e" }}>
                {formatPrice(booking.balance_amount)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 배정 슬롯 리스트 */}
      <section className="px-5 mt-4">
        <div className="flex items-baseline justify-between mb-2">
          <div className="text-sm font-bold" style={{ color: "#0D2B52" }}>
            배정된 파일럿 ({sortedPilots.length}/{booking.headcount})
          </div>
          {sortedPilots.length < booking.headcount && (
            <span className="text-[11px] font-semibold" style={{ color: "#B91C1C" }}>
              {booking.headcount - sortedPilots.length}명 부족
            </span>
          )}
        </div>

        {sortedPilots.length === 0 ? (
          <div
            className="rounded-2xl p-4 text-center text-sm"
            style={{ backgroundColor: "white", border: "1px dashed #FCA5A5", color: "#B91C1C" }}
          >
            아직 배정된 파일럿이 없습니다. 아래 "자동 재배정"을 눌러주세요.
          </div>
        ) : (
          <div className="space-y-2">
            {sortedPilots.map((bp) => {
              const t = bp.assigned_flight_time?.slice(0, 5) ?? requestedTime;
              const spilled = !!bp.assigned_flight_time && t !== requestedTime;
              return (
                <div
                  key={bp.id}
                  className="rounded-2xl bg-white p-3"
                  style={{
                    border: `1.5px solid ${spilled ? "#FCD34D" : "#E5E7EB"}`,
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                        style={{ backgroundColor: "#0D2B52", color: "white" }}
                      >
                        #{bp.slot_no}
                      </div>
                      <div className="min-w-0">
                        <div className="text-base font-bold truncate" style={{ color: "#0D2B52" }}>
                          {bp.pilots?.name ?? "—"}
                        </div>
                        <div
                          className="text-xs mt-0.5 flex items-center gap-1"
                          style={{ color: spilled ? "#B45309" : "#65675e" }}
                        >
                          <Plane size={11} />
                          {t}
                          {spilled && (
                            <span
                              className="ml-1 px-1 rounded text-[10px] font-bold"
                              style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}
                            >
                              이월
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setSwapTarget(bp)}
                      className="flex-1 h-10 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 active:scale-[0.99] disabled:opacity-50"
                      style={{ backgroundColor: "#EFF6FF", color: "#2A7AE2" }}
                    >
                      <Repeat2 size={15} /> 교체
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleRelease(bp)}
                      className="flex-1 h-10 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 active:scale-[0.99] disabled:opacity-50"
                      style={{ backgroundColor: "#FEF2F2", color: "#B91C1C" }}
                    >
                      <Trash2 size={15} /> 해제
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 자동 재배정 */}
      <section className="px-5 mt-5">
        <button
          type="button"
          onClick={handleAutoReassign}
          disabled={busy}
          className="w-full h-12 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50"
          style={{ backgroundColor: "white", color: "#0D2B52", border: "1.5px dashed #0D2B52" }}
        >
          <Wand2 size={16} />
          자동 재배정 다시 돌리기
        </button>
        <div className="text-[11px] mt-2 text-center" style={{ color: "#9ea096" }}>
          현재 배정을 모두 지우고 자동 알고리즘으로 다시 채웁니다.
        </div>
      </section>

      {/* 교체 BottomSheet */}
      <BottomSheet
        open={!!swapTarget}
        onClose={() => setSwapTarget(null)}
        title={
          swapTarget
            ? `#${swapTarget.slot_no} ${
                swapTarget.assigned_flight_time?.slice(0, 5) ?? requestedTime
              } 가용 파일럿`
            : "파일럿 교체"
        }
      >
        {swapTarget && (
          <div>
            <div
              className="text-[11px] p-2 rounded-md mb-3"
              style={{ backgroundColor: "#F3F4F6", color: "#65675e" }}
            >
              그 시각에 배정 가능한 파일럿만 표시됩니다 (휴무·기타 제외, 시각 중복 제외, 당일 비행수 적은 순).
            </div>
            {candidates.length === 0 ? (
              <div className="py-8 text-center text-sm" style={{ color: "#B91C1C" }}>
                해당 시각에 가용 파일럿이 없습니다.
              </div>
            ) : (
              <div className="space-y-1.5">
                {candidates.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSwap(p)}
                    disabled={busy}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-white active:scale-[0.99] disabled:opacity-50"
                    style={{ border: "1px solid #E5E7EB" }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ backgroundColor: "#EFF6FF", color: "#2A7AE2" }}
                      >
                        {p.name?.[0] ?? "?"}
                      </div>
                      <div className="text-sm font-bold" style={{ color: "#0D2B52" }}>
                        {p.name}
                      </div>
                    </div>
                    <div className="text-[11px]" style={{ color: "#65675e" }}>
                      당일 {p.todayFlights}건
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </BottomSheet>

      {/* 자동 재배정 결과 시트 */}
      <BottomSheet
        open={!!reassignResult}
        onClose={() => setReassignResult(null)}
        title={reassignResult?.kind === "ok" ? "자동 재배정 완료" : "자리 부족"}
      >
        {reassignResult?.kind === "ok" && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 size={22} style={{ color: "#047857" }} />
              <span className="text-base font-bold" style={{ color: "#0D2B52" }}>
                재배정 성공
              </span>
            </div>
            <div className="text-sm" style={{ color: "#4d4f46" }}>
              새 배정이 위 화면에 반영되었습니다.
            </div>
            <button
              type="button"
              onClick={() => setReassignResult(null)}
              className="mt-5 w-full h-12 rounded-xl font-bold text-white"
              style={{ backgroundColor: "#0D2B52" }}
            >
              확인
            </button>
          </div>
        )}
        {reassignResult?.kind === "exhausted" && (
          <div>
            <div
              className="rounded-xl p-3 flex items-start gap-2"
              style={{ backgroundColor: "#FEF2F2" }}
            >
              <AlertTriangle size={18} style={{ color: "#B91C1C" }} className="shrink-0 mt-0.5" />
              <div className="text-sm" style={{ color: "#B91C1C" }}>
                영업종료까지 자리가 부족합니다 ({reassignResult.shortage}명 부족).
                <br />
                다른 시간대로 옮기거나 일부 인원 취소를 검토해주세요.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setReassignResult(null)}
              className="mt-5 w-full h-12 rounded-xl font-bold text-white"
              style={{ backgroundColor: "#0D2B52" }}
            >
              확인
            </button>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
