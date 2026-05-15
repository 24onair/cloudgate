/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/tenant";

// ── GET /api/flight_records ──────────────────────────────────────
// ?date=YYYY-MM-DD | ?from=&to= | ?pilot_id=
export async function GET(req: NextRequest) {
  try {
    const supabase  = createServerClient() as any;
    const tenantId  = await getTenantId();
    const { searchParams } = new URL(req.url);

    const date     = searchParams.get("date");
    const from     = searchParams.get("from");
    const to       = searchParams.get("to");
    const pilotId  = searchParams.get("pilot_id");

    let query = supabase
      .from("flight_records")
      .select("*, pilots(id, name), bookings(id, booking_no, customer_name, product_name, headcount, flight_time, options, total_price, booking_pilots(pilot_id))")
      .eq("tenant_id", tenantId)
      .order("flight_date", { ascending: false });

    if (date)     query = query.eq("flight_date", date);
    if (from)     query = query.gte("flight_date", from);
    if (to)       query = query.lte("flight_date", to);
    if (pilotId)  query = query.eq("pilot_id", pilotId);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// ── POST /api/flight_records ─────────────────────────────────────
// 착륙 완료 처리 시 생성
export async function POST(req: NextRequest) {
  try {
    const supabase  = createServerClient() as any;
    const tenantId  = await getTenantId();
    const body      = await req.json();

    const {
      booking_id,
      pilot_id,
      flight_date,
      takeoff_at,
      landing_at,
      weather_grade = null,
      memo = null,
    } = body;

    // 중복 방지: 같은 booking_id로 이미 기록이 있으면 업데이트
    const { data: existing } = await supabase
      .from("flight_records")
      .select("id")
      .eq("booking_id", booking_id)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from("flight_records")
        .update({ takeoff_at, landing_at, weather_grade, memo })
        .eq("id", existing.id)
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data);
    }

    const { data, error } = await supabase
      .from("flight_records")
      .insert({
        tenant_id: tenantId,
        booking_id,
        pilot_id,
        flight_date,
        takeoff_at,
        landing_at,
        weather_grade,
        memo,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
