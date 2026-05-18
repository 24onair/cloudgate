/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * GET /api/bookings/day-capacity?date=YYYY-MM-DD
 *
 * 고객 예약 페이지·어드민 신규 예약 페이지가 슬롯 단위가 아닌
 * "그날 전체 가용 비행 수"를 표시하기 위한 엔드포인트.
 *
 * 정책 (현장 도착 시 파일럿 배정 모델):
 *  - 예약 시점에는 파일럿을 배정하지 않으므로 booking_pilots row가 없음
 *  - 슬롯 점유는 bookings.flight_time + headcount 합으로 계산
 *  - 한 슬롯의 capacity = 그날 활성 파일럿 수 (휴무 제외)
 *  - 그날 전체 capacity = active_pilots × 영업시간 슬롯 수
 *
 * 응답:
 *  - active_pilots: 그날 활성 파일럿 수 (휴무·기타 제외)
 *  - slot_count   : site_settings.slot_config 기반 영업시간 슬롯 개수
 *  - slots[]      : 슬롯별 { time, occupied, free, exhausted }
 *                   occupied = 그 시각 예약된 headcount 합
 *                   free     = active_pilots - occupied (음수 방지)
 *  - total        : active_pilots × slot_count
 *  - booked       : 그날 cancelled 제외 booking의 headcount 합
 *  - remaining    : total - booked (음수 방지)
 *  - exhausted    : remaining === 0
 *
 * 이력:
 *  - v1: total = 활성 파일럿 수 (슬롯 개념 무시 — 단일 단체에서 즉시 마감)
 *  - v2: total = active × slot_count, occupied = booking_pilots row 수
 *  - v3 (현): occupied = bookings.headcount 합 — 예약 시점에 파일럿 배정을
 *           하지 않으므로 booking_pilots는 점유 척도로 못 씀.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/tenant";

interface SlotConfig {
  startTime: string;
  endTime: string;
  intervalMinutes: number;
}

const DEFAULT_SLOT_CFG: SlotConfig = {
  startTime: "09:00",
  endTime: "17:00",
  intervalMinutes: 30,
};

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function countSlots(cfg: SlotConfig): number {
  const s = timeToMinutes(cfg.startTime);
  const e = timeToMinutes(cfg.endTime);
  if (cfg.intervalMinutes <= 0 || e < s) return 0;
  return Math.floor((e - s) / cfg.intervalMinutes) + 1;
}

function generateSlotTimes(cfg: SlotConfig): string[] {
  const s = timeToMinutes(cfg.startTime);
  const e = timeToMinutes(cfg.endTime);
  if (cfg.intervalMinutes <= 0 || e < s) return [];
  const out: string[] = [];
  for (let t = s; t <= e; t += cfg.intervalMinutes) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
  return out;
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "date는 YYYY-MM-DD 형식 필수" }, { status: 400 });
    }

    const [
      { data: pilots },
      { data: schedules },
      { data: slotCfgRow },
      { data: bkRows },
    ] = await Promise.all([
      supabase
        .from("pilots")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("status", "active"),
      supabase
        .from("pilot_schedules")
        .select("pilot_id, type")
        .eq("tenant_id", tenantId)
        .eq("date", date),
      supabase
        .from("site_settings")
        .select("value")
        .eq("tenant_id", tenantId)
        .eq("key", "slot_config")
        .maybeSingle(),
      // 그날 cancelled 제외 booking — 점유 척도로 flight_time + headcount 사용.
      // 파일럿 배정 자체는 현장 도착 시점에 일어나므로 booking_pilots는 못 씀.
      supabase
        .from("bookings")
        .select("flight_time, headcount, status")
        .eq("tenant_id", tenantId)
        .eq("flight_date", date)
        .neq("status", "cancelled"),
    ]);

    const unavailable = new Set<string>();
    for (const s of schedules ?? []) {
      if (s.type === "off" || s.type === "other") unavailable.add(s.pilot_id);
    }
    const activePilots = (pilots ?? []).filter(
      (p: any) => !unavailable.has(p.id),
    ).length;

    const cfg: SlotConfig = { ...DEFAULT_SLOT_CFG, ...(slotCfgRow?.value ?? {}) };
    const slotTimesList = generateSlotTimes(cfg);
    const slotCount = slotTimesList.length;

    // 슬롯별 점유 집계 — booking.flight_time을 "HH:MM"으로 정규화한 뒤 그 슬롯에
    // headcount를 더함. 슬롯 capacity = activePilots (그 시각 한 파일럿 1손님).
    // 슬롯에 정의되지 않은 시각의 예약은 occupied 집계에서 제외 (slot_config 정정 책임).
    const slotOccupied: Record<string, number> = {};
    for (const t of slotTimesList) slotOccupied[t] = 0;
    let booked = 0;
    for (const row of (bkRows ?? []) as Array<{
      flight_time: string | null;
      headcount: number | null;
    }>) {
      const head = Number(row.headcount) || 0;
      booked += head;
      const raw = row.flight_time;
      if (!raw) continue;
      const key = String(raw).slice(0, 5); // "HH:MM:SS" or "HH:MM" → "HH:MM"
      if (key in slotOccupied) slotOccupied[key] += head;
    }
    const slots = slotTimesList.map((time) => {
      const occupied = slotOccupied[time];
      const free = Math.max(0, activePilots - occupied);
      return { time, occupied, free, exhausted: free === 0 };
    });

    const total = activePilots * slotCount;
    const remaining = Math.max(0, total - booked);

    return NextResponse.json({
      date,
      active_pilots: activePilots,
      slot_count: slotCount,
      slots,
      total,
      booked,
      remaining,
      exhausted: remaining === 0,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
