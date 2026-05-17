/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * GET /api/bookings/day-capacity?date=YYYY-MM-DD
 *
 * 고객 예약 페이지·어드민 신규 예약 페이지가 슬롯 단위가 아닌
 * "그날 전체 가용 비행 수"를 표시하기 위한 엔드포인트.
 *
 * 정책:
 *  - 한 파일럿은 같은 슬롯에서 1회만 비행 (assigner의 assignedAtCursor 제약)
 *  - 같은 파일럿이 다른 슬롯에 또 비행 가능 (슬롯 간격 = 이동 시간으로 흡수)
 *  → 그날 가능한 비행 수의 상한 = (활성 파일럿 - 휴무자) × 영업시간 슬롯 수
 *
 * 응답:
 *  - active_pilots: 그날 활성 파일럿 수 (휴무·기타 제외)
 *  - slot_count   : site_settings.slot_config 기반 영업시간 슬롯 개수
 *  - total        : 그날 전체 capacity = active_pilots × slot_count
 *  - booked       : 그날 이미 배정된 booking_pilots row 수 (cancelled 예약은 제외)
 *  - remaining    : total - booked (음수 방지)
 *  - exhausted    : remaining === 0
 *
 * 이전 구현은 total을 단순 활성 파일럿 수로 잡아 슬롯 개념을 무시했기 때문에,
 * 활성 5명 + booked headcount ≥ 5 케이스에서 다른 슬롯이 텅 비어 있어도
 * "자리 마감"으로 잘못 표시되는 버그가 있었다.
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
      { data: bpRows },
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
      // 그날 booking_pilots row (cancelled booking은 제외).
      // booking_pilots는 booking 취소 시 자동으로 정리되지 않을 수 있어 join으로 보강.
      supabase
        .from("booking_pilots")
        .select("id, bookings!inner(status, flight_date)")
        .eq("tenant_id", tenantId)
        .eq("bookings.flight_date", date)
        .neq("bookings.status", "cancelled"),
    ]);

    const unavailable = new Set<string>();
    for (const s of schedules ?? []) {
      if (s.type === "off" || s.type === "other") unavailable.add(s.pilot_id);
    }
    const activePilots = (pilots ?? []).filter(
      (p: any) => !unavailable.has(p.id),
    ).length;

    const cfg: SlotConfig = { ...DEFAULT_SLOT_CFG, ...(slotCfgRow?.value ?? {}) };
    const slotCount = countSlots(cfg);

    const total = activePilots * slotCount;
    const booked = (bpRows ?? []).length;
    const remaining = Math.max(0, total - booked);

    return NextResponse.json({
      date,
      active_pilots: activePilots,
      slot_count: slotCount,
      total,
      booked,
      remaining,
      exhausted: remaining === 0,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
