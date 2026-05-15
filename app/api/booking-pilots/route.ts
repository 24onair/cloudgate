/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/tenant";

// ── GET /api/booking-pilots?booking_id=UUID ──────────────────────
// 해당 예약에 배정된 파일럿 목록 반환
// Response: [{ id, slot_no, pilot_id, pilots: { id, name } }]
export async function GET(req: NextRequest) {
  try {
    const supabase  = createServerClient() as any;
    const tenantId  = await getTenantId();
    const { searchParams } = new URL(req.url);
    const bookingId = searchParams.get("booking_id");

    if (!bookingId) {
      return NextResponse.json({ error: "booking_id는 필수입니다." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("booking_pilots")
      .select("id, slot_no, pilot_id, pilots(id, name)")
      .eq("booking_id", bookingId)
      .eq("tenant_id", tenantId)
      .order("slot_no", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// ── POST /api/booking-pilots ─────────────────────────────────────
// 파일럿 배정
// Body: { booking_id, pilot_id, slot_no }
// 배정 후 bookings.pilot_id도 slot_no=1 파일럿으로 동기화 (하위 호환)
export async function POST(req: NextRequest) {
  try {
    const supabase  = createServerClient() as any;
    const tenantId  = await getTenantId();
    const body      = await req.json();
    const { booking_id, pilot_id, slot_no = 1 } = body;

    if (!booking_id || !pilot_id) {
      return NextResponse.json({ error: "booking_id와 pilot_id는 필수입니다." }, { status: 400 });
    }

    // booking_pilots upsert
    const { data, error } = await supabase
      .from("booking_pilots")
      .upsert(
        { tenant_id: tenantId, booking_id, pilot_id, slot_no },
        { onConflict: "booking_id,pilot_id" }
      )
      .select("id, slot_no, pilot_id, pilots(id, name)")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // slot_no=1 파일럿을 bookings.pilot_id에 동기화 (하위 호환)
    if (slot_no === 1) {
      await supabase
        .from("bookings")
        .update({ pilot_id })
        .eq("id", booking_id)
        .eq("tenant_id", tenantId);
    }

    return NextResponse.json(data, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// ── DELETE /api/booking-pilots ───────────────────────────────────
// 파일럿 배정 해제
// Body: { booking_id, pilot_id }
export async function DELETE(req: NextRequest) {
  try {
    const supabase  = createServerClient() as any;
    const tenantId  = await getTenantId();
    const body      = await req.json();
    const { booking_id, pilot_id } = body;

    if (!booking_id || !pilot_id) {
      return NextResponse.json({ error: "booking_id와 pilot_id는 필수입니다." }, { status: 400 });
    }

    // 삭제할 행의 slot_no 먼저 확인
    const { data: target } = await supabase
      .from("booking_pilots")
      .select("slot_no")
      .eq("booking_id", booking_id)
      .eq("pilot_id", pilot_id)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    const { error } = await supabase
      .from("booking_pilots")
      .delete()
      .eq("booking_id", booking_id)
      .eq("pilot_id", pilot_id)
      .eq("tenant_id", tenantId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // slot_no=1 파일럿이 제거되면 bookings.pilot_id를 다음 파일럿으로 업데이트
    if (target?.slot_no === 1) {
      const { data: nextPilot } = await supabase
        .from("booking_pilots")
        .select("pilot_id")
        .eq("booking_id", booking_id)
        .eq("tenant_id", tenantId)
        .order("slot_no", { ascending: true })
        .limit(1)
        .maybeSingle();

      await supabase
        .from("bookings")
        .update({ pilot_id: nextPilot?.pilot_id ?? null })
        .eq("id", booking_id)
        .eq("tenant_id", tenantId);
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
