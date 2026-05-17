/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * POST /api/admin/sync-flight-records
 * completed 상태인 bookings 중 flight_records가 누락된 건을 소급 생성한다.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/tenant";
import { requireAdmin } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const supabase  = createServerClient() as any;
    const tenantId  = await getTenantId();

    // 1. 완료된 예약 전체 조회
    const { data: bookings, error: bErr } = await supabase
      .from("bookings")
      .select("id, flight_date, pilot_id, booking_pilots(pilot_id)")
      .eq("tenant_id", tenantId)
      .eq("status", "completed");

    if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 });

    let created = 0;
    let skipped = 0;

    for (const booking of bookings ?? []) {
      const flightDate: string = booking.flight_date ?? new Date().toLocaleDateString("sv-SE");

      const pilotIds: string[] = (booking.booking_pilots ?? [])
        .map((bp: any) => bp.pilot_id)
        .filter(Boolean);
      if (pilotIds.length === 0 && booking.pilot_id) pilotIds.push(booking.pilot_id);
      if (pilotIds.length === 0) { skipped++; continue; }

      for (const pilotId of pilotIds) {
        const { data: existing } = await supabase
          .from("flight_records")
          .select("id")
          .eq("booking_id", booking.id)
          .eq("pilot_id", pilotId)
          .maybeSingle();

        if (existing) { skipped++; continue; }

        const { error: iErr } = await supabase.from("flight_records").insert({
          tenant_id:   tenantId,
          booking_id:  booking.id,
          pilot_id:    pilotId,
          flight_date: flightDate,
          landing_at:  null,
        });

        if (iErr) { skipped++; continue; }
        created++;
      }
    }

    return NextResponse.json({ ok: true, created, skipped });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
