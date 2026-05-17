/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * POST /api/admin/booking-pilots/auto-assign
 * Body: { booking_id }
 *
 * 동작:
 *  1. 예약 정보(date, time, headcount) 로드
 *  2. 기존 booking_pilots 삭제 (재배정 시나리오 대응)
 *  3. assignPilotsForBooking 호출 → 이월 포함 결과
 *  4-a. 정상: booking_pilots 일괄 삽입, bookings.assignment_status='auto', pilot_id 동기화
 *  4-b. 영업종료 초과: bookings.assignment_status='pending_admin_review' 갱신 + 400
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/tenant";
import { requireAdmin } from "@/lib/auth/session";
import { assignPilotsForBooking } from "@/lib/pilot-assigner/assign";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();
    const { booking_id } = await req.json();

    if (!booking_id) {
      return NextResponse.json({ error: "booking_id는 필수입니다." }, { status: 400 });
    }

    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .select("id, flight_date, flight_time, headcount")
      .eq("id", booking_id)
      .eq("tenant_id", tenantId)
      .single();

    if (bErr || !booking) {
      return NextResponse.json({ error: "예약을 찾을 수 없습니다." }, { status: 404 });
    }
    if (!booking.flight_date || !booking.flight_time || !booking.headcount) {
      return NextResponse.json(
        { error: "예약에 비행일/시간/인원이 누락되어 자동 배정 불가합니다." },
        { status: 400 },
      );
    }

    // 기존 배정 비우기 (재배정 안전)
    await supabase
      .from("booking_pilots")
      .delete()
      .eq("booking_id", booking_id)
      .eq("tenant_id", tenantId);

    const result = await assignPilotsForBooking({
      supabase,
      tenantId,
      date: booking.flight_date,
      requestedTime: booking.flight_time,
      headcount: booking.headcount,
    });

    if (result.exhausted) {
      await supabase
        .from("bookings")
        .update({ assignment_status: "pending_admin_review", pilot_id: null })
        .eq("id", booking_id)
        .eq("tenant_id", tenantId);
      return NextResponse.json(
        {
          error: "영업종료까지 자리가 부족합니다. 어드민 수동 처리가 필요합니다.",
          shortage: result.exhaustedShortage,
          assignment_status: "pending_admin_review",
        },
        { status: 409 },
      );
    }

    const rows = result.assignments.map((a) => ({
      tenant_id: tenantId,
      booking_id,
      pilot_id: a.pilot_id,
      slot_no: a.slot_no,
      assigned_flight_time: a.assigned_flight_time,
    }));

    const { error: insErr } = await supabase.from("booking_pilots").insert(rows);
    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    const slot1 = result.assignments.find((a) => a.slot_no === 1);
    await supabase
      .from("bookings")
      .update({
        assignment_status: "auto",
        pilot_id: slot1?.pilot_id ?? null,
      })
      .eq("id", booking_id)
      .eq("tenant_id", tenantId);

    return NextResponse.json({
      ok: true,
      assignments: result.assignments,
      spillover: result.spillover,
      requestedTime: result.requestedTime,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
