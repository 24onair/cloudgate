/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/tenant";

// DB type → UI status 변환
const DB_TO_UI: Record<string, string> = {
  work:    "working",
  off:     "off",
  standby: "standby",
  other:   "etc",
};

// UI status → DB type 변환
const UI_TO_DB: Record<string, string> = {
  working: "work",
  off:     "off",
  standby: "standby",
  etc:     "other",
};

// ── GET /api/schedules ───────────────────────────────────────────
// Query param: year_month=2026-05 (optional)
// Response: { pilotId: { "2026-05-01": "working", ... }, ... }
export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();
    const { searchParams } = new URL(req.url);
    const yearMonth = searchParams.get("year_month"); // e.g. "2026-05"

    let query = supabase
      .from("pilot_schedules")
      .select("pilot_id, date, type")
      .eq("tenant_id", tenantId);

    if (yearMonth) {
      const from = `${yearMonth}-01`;
      const [year, mon] = yearMonth.split("-").map(Number);
      const lastDay = new Date(year, mon, 0).getDate();
      const to = `${yearMonth}-${String(lastDay).padStart(2, "0")}`;
      query = query.gte("date", from).lte("date", to);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // pilotId별로 그룹화
    const grouped: Record<string, Record<string, string>> = {};
    for (const row of data ?? []) {
      const pilotId = row.pilot_id;
      const dateKey = typeof row.date === "string" ? row.date : String(row.date);
      const uiStatus = DB_TO_UI[row.type] ?? row.type;

      if (!grouped[pilotId]) grouped[pilotId] = {};
      grouped[pilotId][dateKey] = uiStatus;
    }

    // 스케줄 기록이 없는 재직 파일럿도 포함 (기본값 = 출근/가용)
    // 이렇게 해야 예약 페이지의 countAvailablePilots()가 정확히 동작함
    const { data: pilotRows } = await supabase
      .from("pilots")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("status", "active");
    for (const p of pilotRows ?? []) {
      if (!grouped[p.id]) grouped[p.id] = {};
    }

    return NextResponse.json(grouped);
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// ── POST /api/schedules ──────────────────────────────────────────
// Body: { pilotId, date, status }
// status: "working" | "off" | "standby" | "etc"
export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();
    const body = await req.json();
    const { pilotId, date, status } = body;

    const dbType = UI_TO_DB[status] ?? status;

    const { data, error } = await supabase
      .from("pilot_schedules")
      .upsert(
        { tenant_id: tenantId, pilot_id: pilotId, date, type: dbType },
        { onConflict: "pilot_id,date" }
      )
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({
      ...data,
      status: DB_TO_UI[data.type] ?? data.type,
    }, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
