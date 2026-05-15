/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/tenant";

// ── GET /api/blocked-slots ───────────────────────────────────────
// Query param: date=YYYY-MM-DD (optional)
// Response: { "YYYY-MM-DD": ["HH:MM", ...], ... }
export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    let query = supabase
      .from("blocked_slots")
      .select("date, time")
      .eq("tenant_id", tenantId);

    if (date) query = query.eq("date", date);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // 날짜별로 그룹화
    const grouped: Record<string, string[]> = {};
    for (const row of data ?? []) {
      const key = typeof row.date === "string" ? row.date : row.date;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(row.time);
    }

    return NextResponse.json(grouped);
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// ── POST /api/blocked-slots ──────────────────────────────────────
// Body: { date: "YYYY-MM-DD", time: "HH:MM" }
export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();
    const body = await req.json();
    const { date, time } = body;

    const { data, error } = await supabase
      .from("blocked_slots")
      .upsert(
        { tenant_id: tenantId, date, time },
        { onConflict: "tenant_id,date,time", ignoreDuplicates: true }
      )
      .select()
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? { tenant_id: tenantId, date, time }, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// ── DELETE /api/blocked-slots ────────────────────────────────────
// Body: { date: "YYYY-MM-DD", time: "HH:MM" }
export async function DELETE(req: NextRequest) {
  try {
    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();
    const body = await req.json();
    const { date, time } = body;

    const { error } = await supabase
      .from("blocked_slots")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("date", date)
      .eq("time", time);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
