/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/tenant";

type Ctx = { params: Promise<{ id: string }> };

// ── GET /api/bookings/:id ────────────────────────────────────────
export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id }   = await ctx.params;
    const supabase = createServerClient() as any;
    const { data, error } = await supabase
      .from("bookings")
      .select("*, pilots(id, name), booking_pilots(slot_no, pilot_id, pilots(id, name))")
      .eq("id", id)
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json(data);
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// ── PATCH /api/bookings/:id ──────────────────────────────────────
export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id }   = await ctx.params;
    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();
    const body     = await req.json();

    const { data, error } = await supabase
      .from("bookings")
      .update(body)
      .eq("id", id)
      .select("*, pilots(id, name), booking_pilots(slot_no, pilot_id, pilots(id, name))")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // ── status → "completed" 시 flight_records 자동 생성 ──────────
    if (body.status === "completed" && data) {
      const flightDate: string = data.flight_date ?? new Date().toLocaleDateString("sv-SE");

      // 배정된 파일럿 목록: booking_pilots 우선, 없으면 legacy pilot_id
      const pilotIds: string[] = (data.booking_pilots ?? [])
        .map((bp: any) => bp.pilot_id)
        .filter(Boolean);
      if (pilotIds.length === 0 && data.pilot_id) pilotIds.push(data.pilot_id);

      for (const pilotId of pilotIds) {
        // 이미 기록이 있으면 스킵
        const { data: existing } = await supabase
          .from("flight_records")
          .select("id")
          .eq("booking_id", id)
          .eq("pilot_id", pilotId)
          .maybeSingle();
        if (existing) continue;

        await supabase.from("flight_records").insert({
          tenant_id:   tenantId,
          booking_id:  id,
          pilot_id:    pilotId,
          flight_date: flightDate,
          landing_at:  body.landing_at ?? null,
        });
      }
    }

    return NextResponse.json(data);
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// ── DELETE /api/bookings/:id ─────────────────────────────────────
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { id }   = await ctx.params;
    const supabase = createServerClient() as any;
    const { error } = await supabase
      .from("bookings")
      .delete()
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
