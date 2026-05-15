/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

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
    const body     = await req.json();

    const { data, error } = await supabase
      .from("bookings")
      .update(body)
      .eq("id", id)
      .select("*, pilots(id, name), booking_pilots(slot_no, pilot_id, pilots(id, name))")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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
