/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * GET  /api/admin/pilots/rotation
 *   - 활성 파일럿 + 기본 순번(rotation_order) 반환. 순번 오름차순.
 *   - 응답: [{ id, name, rotation_order }]
 *
 * PUT  /api/admin/pilots/rotation
 *   - 기본 순번 일괄 업데이트.
 *   - Body: { orders: [{ pilot_id, rotation_order }] }
 *     혹은    { orders: [pilot_id, ...] }  ← 배열 그대로면 1부터 순서대로 부여
 *
 * 일자 오버라이드는 별도 라우트 (./override/route.ts).
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/tenant";
import { requireAdmin } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();
    const { data, error } = await supabase
      .from("pilots")
      .select("id, name, rotation_order, status")
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      // null은 가장 뒤로
      .order("rotation_order", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
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
    const raw = body?.orders;
    if (!Array.isArray(raw) || raw.length === 0) {
      return NextResponse.json({ error: "orders 배열이 필요합니다." }, { status: 400 });
    }

    // 두 가지 입력 형식 지원
    let pairs: { pilot_id: string; rotation_order: number }[];
    if (typeof raw[0] === "string") {
      pairs = (raw as string[]).map((pid, i) => ({
        pilot_id: pid,
        rotation_order: i + 1,
      }));
    } else {
      pairs = (raw as { pilot_id: string; rotation_order: number }[]).filter(
        (x) => x?.pilot_id && Number.isFinite(x?.rotation_order),
      );
    }

    if (pairs.length === 0) {
      return NextResponse.json({ error: "유효한 항목이 없습니다." }, { status: 400 });
    }

    // 일괄 업데이트 — 한 행씩 update (Supabase는 다중 행 update를 case문 없이 쉽게 못 하므로)
    const errors: string[] = [];
    await Promise.all(
      pairs.map(async ({ pilot_id, rotation_order }) => {
        const { error } = await supabase
          .from("pilots")
          .update({ rotation_order })
          .eq("id", pilot_id)
          .eq("tenant_id", tenantId);
        if (error) errors.push(`${pilot_id}: ${error.message}`);
      }),
    );
    if (errors.length > 0) {
      return NextResponse.json(
        { error: "일부 파일럿 업데이트 실패", details: errors },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true, updated: pairs.length });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
