/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * GET /api/bookings/day-capacity?date=YYYY-MM-DD
 *
 * 고객 예약 페이지가 슬롯 단위가 아닌 "그날 전체 가용 인원"을 표시하기 위한 엔드포인트.
 *
 *  - total       : 그날 가용 파일럿 수 (pilots.status='active' AND schedule.type ∉ {'off','other'})
 *  - booked      : 그날 이미 확정된 예약 headcount 합 (status ∈ {'pending','confirmed','in_progress','completed'})
 *  - remaining   : total − booked (음수 방지)
 *  - exhausted   : remaining ≤ 0
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/tenant";

const BOOKED_STATUSES = ["pending", "confirmed", "in_progress", "completed"];

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "date는 YYYY-MM-DD 형식 필수" }, { status: 400 });
    }

    const [{ data: pilots }, { data: schedules }, { data: bookings }] = await Promise.all([
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
        .from("bookings")
        .select("headcount, status")
        .eq("tenant_id", tenantId)
        .eq("flight_date", date)
        .in("status", BOOKED_STATUSES),
    ]);

    const unavailable = new Set<string>();
    for (const s of schedules ?? []) {
      if (s.type === "off" || s.type === "other") unavailable.add(s.pilot_id);
    }
    const total = (pilots ?? []).filter((p: any) => !unavailable.has(p.id)).length;

    const booked = (bookings ?? []).reduce(
      (sum: number, b: any) => sum + (Number(b.headcount) || 0),
      0,
    );

    const remaining = Math.max(0, total - booked);
    return NextResponse.json({
      date,
      total,
      booked,
      remaining,
      exhausted: remaining === 0,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
