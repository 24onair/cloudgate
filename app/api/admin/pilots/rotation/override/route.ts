/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * 일자별 파일럿 순번 오버라이드.
 *
 * GET    /api/admin/pilots/rotation/override?date=YYYY-MM-DD
 *   - 그 날 오버라이드 + 기본 순번을 합쳐 "현재 적용되는 effective 순번" 반환.
 *   - 응답: [{ id, name, rotation_order, override_order, effective_order }]
 *           effective_order = override_order ?? rotation_order ?? null
 *
 * PUT    /api/admin/pilots/rotation/override
 *   - Body: { date: "YYYY-MM-DD", orders: [pilot_id, ...] | [{pilot_id, order_idx}] }
 *   - 그 날 모든 기존 오버라이드 삭제 후 새로 일괄 INSERT (간단·결정적).
 *
 * DELETE /api/admin/pilots/rotation/override?date=YYYY-MM-DD
 *   - 그 날 오버라이드 모두 삭제 → 자동 배정 시 기본 순번으로 폴백.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/tenant";
import { requireAdmin } from "@/lib/auth/session";

function validDate(s: string | null): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    if (!validDate(date)) {
      return NextResponse.json({ error: "date(YYYY-MM-DD) 필수" }, { status: 400 });
    }

    const [{ data: pilots }, { data: overrides }] = await Promise.all([
      supabase
        .from("pilots")
        .select("id, name, rotation_order")
        .eq("tenant_id", tenantId)
        .eq("status", "active"),
      supabase
        .from("pilot_rotation_overrides")
        .select("pilot_id, order_idx")
        .eq("tenant_id", tenantId)
        .eq("date", date),
    ]);

    const overrideMap: Record<string, number> = {};
    for (const o of overrides ?? []) overrideMap[o.pilot_id] = o.order_idx;

    const out = (pilots ?? []).map((p: any) => ({
      id: p.id,
      name: p.name,
      rotation_order: p.rotation_order,
      override_order: overrideMap[p.id] ?? null,
      effective_order: overrideMap[p.id] ?? p.rotation_order ?? null,
    }));

    out.sort((a: any, b: any) => {
      const ao = a.effective_order ?? Number.MAX_SAFE_INTEGER;
      const bo = b.effective_order ?? Number.MAX_SAFE_INTEGER;
      if (ao !== bo) return ao - bo;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({
      date,
      hasOverride: (overrides ?? []).length > 0,
      pilots: out,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();
    const body = await req.json();
    const date = body?.date as string | undefined;
    const raw = body?.orders;

    if (!validDate(date ?? null)) {
      return NextResponse.json({ error: "date(YYYY-MM-DD) 필수" }, { status: 400 });
    }
    if (!Array.isArray(raw) || raw.length === 0) {
      return NextResponse.json({ error: "orders 배열 필수" }, { status: 400 });
    }

    let rows: { tenant_id: string; pilot_id: string; date: string; order_idx: number }[];
    if (typeof raw[0] === "string") {
      rows = (raw as string[]).map((pid, i) => ({
        tenant_id: tenantId,
        pilot_id: pid,
        date: date!,
        order_idx: i + 1,
      }));
    } else {
      rows = (raw as { pilot_id: string; order_idx: number }[])
        .filter((x) => x?.pilot_id && Number.isFinite(x?.order_idx))
        .map((x) => ({
          tenant_id: tenantId,
          pilot_id: x.pilot_id,
          date: date!,
          order_idx: x.order_idx,
        }));
    }
    if (rows.length === 0) {
      return NextResponse.json({ error: "유효한 항목이 없습니다." }, { status: 400 });
    }

    // 그 날 기존 오버라이드 전체 삭제 후 새로 INSERT (결정적)
    const { error: delErr } = await supabase
      .from("pilot_rotation_overrides")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("date", date);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

    const { error: insErr } = await supabase
      .from("pilot_rotation_overrides")
      .insert(rows);
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, date, count: rows.length });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    if (!validDate(date)) {
      return NextResponse.json({ error: "date(YYYY-MM-DD) 필수" }, { status: 400 });
    }
    const { error } = await supabase
      .from("pilot_rotation_overrides")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("date", date);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
