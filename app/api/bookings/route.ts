/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/tenant";

// ── GET /api/bookings ────────────────────────────────────────────
// Query params: date=YYYY-MM-DD | date_from+date_to | status | search
export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();
    const { searchParams } = new URL(req.url);

    const date      = searchParams.get("date");
    const dateFrom  = searchParams.get("date_from");
    const dateTo    = searchParams.get("date_to");
    const status    = searchParams.get("status");
    const search    = searchParams.get("search");

    let query = supabase
      .from("bookings")
      .select("*, pilots(id, name), booking_pilots(slot_no, pilot_id, assigned_flight_time, pilots(id, name))")
      .eq("tenant_id", tenantId)
      .order("flight_date", { ascending: true })
      .order("flight_time", { ascending: true });

    if (date)      query = query.eq("flight_date", date);
    if (dateFrom)  query = query.gte("flight_date", dateFrom);
    if (dateTo)    query = query.lte("flight_date", dateTo);
    if (status && status !== "all") query = query.eq("status", status);
    if (search) {
      query = query.or(
        `customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%,booking_no.ilike.%${search}%`
      );
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// ── POST /api/bookings ───────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const supabase  = createServerClient() as any;
    const tenantId  = await getTenantId();
    const body      = await req.json();

    // 예약번호 생성: B-YYYYMMDD-NNNN
    const today  = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const prefix = `B-${today}-`;
    const { count } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .like("booking_no", `${prefix}%`);
    const seq        = String((count ?? 0) + 1).padStart(4, "0");
    const booking_no = `${prefix}${seq}`;

    const {
      customer_name, customer_phone,
      product_id = null, product_name, product_price,
      headcount, flight_date, flight_time,
      options = [],
      total_price, deposit_amount, balance_amount,
      channel = "online", memo = null,
    } = body;

    const { data, error } = await supabase
      .from("bookings")
      .insert({
        tenant_id: tenantId,
        booking_no,
        customer_name,
        customer_phone,
        product_id,
        product_name,
        product_price,
        headcount,
        flight_date,
        flight_time,
        options,
        total_price,
        deposit_amount,
        balance_amount,
        status:   "pending",
        channel,
        pilot_id: null,
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
