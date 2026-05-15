/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/tenant";

// ── GET /api/costs ───────────────────────────────────────────────
// Query param: month=YYYY-MM (optional)
export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month"); // e.g. "2026-05"

    let query = supabase
      .from("costs")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("date", { ascending: false });

    if (month) {
      const from = `${month}-01`;
      // 해당 월의 마지막 날 계산
      const [year, mon] = month.split("-").map(Number);
      const lastDay = new Date(year, mon, 0).getDate();
      const to = `${month}-${String(lastDay).padStart(2, "0")}`;
      query = query.gte("date", from).lte("date", to);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// ── POST /api/costs ──────────────────────────────────────────────
// Body: { date, category, description, amount, memo?, receipt_data_url? }
export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();
    const body = await req.json();
    const { date, category, description, amount, memo, receipt_data_url } = body;

    const { data, error } = await supabase
      .from("costs")
      .insert({
        tenant_id: tenantId,
        date,
        category,
        description: description ?? null,
        amount,
        memo: memo ?? null,
        receipt_data_url: receipt_data_url ?? null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
