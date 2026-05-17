/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/tenant";

// ── GET /api/pilots ──────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const supabase  = createServerClient() as any;
    const tenantId  = await getTenantId();
    const { searchParams } = new URL(req.url);
    const status    = searchParams.get("status");

    let query = supabase
      .from("pilots")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("name", { ascending: true });

    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// ── POST /api/pilots ─────────────────────────────────────────────
// 신규 파일럿 등록 시 정책:
//   - 클라이언트가 rotation_order를 지정하지 않으면 같은 tenant의 max+1 자동 부여
//     (가장 마지막 순번 — 이후 어드민이 수동 조정)
//   - feedback 2026-05-17 "신규입사시 가장 마지막 자동"
export async function POST(req: NextRequest) {
  try {
    const supabase  = createServerClient() as any;
    const tenantId  = await getTenantId();
    const body      = await req.json();

    let rotation_order = body?.rotation_order;
    if (rotation_order == null) {
      const { data: maxRow } = await supabase
        .from("pilots")
        .select("rotation_order")
        .eq("tenant_id", tenantId)
        .not("rotation_order", "is", null)
        .order("rotation_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      rotation_order = (maxRow?.rotation_order ?? 0) + 1;
    }

    const { data, error } = await supabase
      .from("pilots")
      .insert({ ...body, tenant_id: tenantId, rotation_order })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
