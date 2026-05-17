/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * GET /api/pilot/my-rotation?date=YYYY-MM-DD (date 미지정 시 오늘)
 *
 * 파일럿 본인의 큐 위치만 반환. 다른 파일럿의 이름·순번은 노출하지 않음 (총원만).
 *
 * 응답:
 * {
 *   pilot_id, name, date,
 *   base_order:      number | null,   // 기본 rotation_order
 *   override_order:  number | null,   // 그날 오버라이드
 *   effective_order: number | null,   // override ?? base
 *   has_override:    boolean,
 *
 *   // 큐 포인터 정보 (모델 B)
 *   total_active:    number,          // 그날 활성 파일럿 총 수 (휴무 제외)
 *   queue_idx:       number | null,   // 0 = 다음 차례, null = 가용 풀에 없음(휴무 등)
 *   is_off:          boolean,         // 오늘 휴무/기타 등록 여부
 *   is_last_assigned: boolean,        // 본인이 마지막 배정자
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/tenant";
import { requirePilot } from "@/lib/auth/session";

function todayISO() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export async function GET(req: NextRequest) {
  const auth = await requirePilot(req);
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || todayISO();

    const pilotId = auth.payload.sub;

    const [
      { data: me },
      { data: override },
      { data: schedules },
      { data: pilots },
      { data: overrides },
      { data: state },
    ] = await Promise.all([
      supabase
        .from("pilots")
        .select("id, name, rotation_order, status")
        .eq("id", pilotId)
        .eq("tenant_id", tenantId)
        .single(),
      supabase
        .from("pilot_rotation_overrides")
        .select("order_idx")
        .eq("tenant_id", tenantId)
        .eq("pilot_id", pilotId)
        .eq("date", date)
        .maybeSingle(),
      // 그날 휴무·기타 파일럿 식별용
      supabase
        .from("pilot_schedules")
        .select("pilot_id, type")
        .eq("tenant_id", tenantId)
        .eq("date", date),
      // 활성 파일럿 전체 (큐 계산에 필요)
      supabase
        .from("pilots")
        .select("id, name, rotation_order")
        .eq("tenant_id", tenantId)
        .eq("status", "active"),
      // 그날 모든 오버라이드 (큐 정렬에 사용)
      supabase
        .from("pilot_rotation_overrides")
        .select("pilot_id, order_idx")
        .eq("tenant_id", tenantId)
        .eq("date", date),
      // 큐 포인터
      supabase
        .from("pilot_rotation_state")
        .select("last_assigned_pilot_id")
        .eq("tenant_id", tenantId)
        .maybeSingle(),
    ]);

    if (!me) return NextResponse.json({ error: "파일럿 없음" }, { status: 404 });

    // 휴무/기타 파일럿 셋
    const off = new Set<string>();
    for (const s of (schedules ?? []) as Array<{ pilot_id: string; type: string }>) {
      if (s.type === "off" || s.type === "other") off.add(s.pilot_id);
    }

    // 오버라이드 맵
    const overrideMap: Record<string, number> = {};
    for (const o of (overrides ?? []) as Array<{ pilot_id: string; order_idx: number }>) {
      overrideMap[o.pilot_id] = o.order_idx;
    }

    // 가용 풀
    const available = (pilots ?? [])
      .filter((p: any) => !off.has(p.id))
      .map((p: any) => ({
        id: p.id as string,
        name: (p.name ?? "") as string,
        effective_order: (overrideMap[p.id] ?? p.rotation_order ?? Number.MAX_SAFE_INTEGER) as number,
      }));

    const ordered = [...available].sort((a, b) => {
      if (a.effective_order !== b.effective_order) return a.effective_order - b.effective_order;
      return a.name.localeCompare(b.name);
    });

    const N = ordered.length;
    const lastId: string | null = state?.last_assigned_pilot_id ?? null;
    let startIdx = 0;
    if (lastId) {
      const idx = ordered.findIndex((p) => p.id === lastId);
      startIdx = idx >= 0 ? (idx + 1) % N : 0;
    }

    // 본인의 큐 인덱스
    const myPosInOrdered = ordered.findIndex((p) => p.id === pilotId);
    const queueIdx = myPosInOrdered < 0 || N === 0
      ? null
      : (myPosInOrdered - startIdx + N) % N;

    const baseOrder = me.rotation_order ?? null;
    const overrideOrder = override?.order_idx ?? null;
    const effectiveOrder = overrideOrder ?? baseOrder;
    const isOff = off.has(pilotId);

    return NextResponse.json({
      pilot_id: me.id,
      name: me.name,
      date,
      base_order: baseOrder,
      override_order: overrideOrder,
      effective_order: effectiveOrder,
      has_override: overrideOrder != null,
      total_active: N,
      queue_idx: queueIdx,
      is_off: isOff,
      is_last_assigned: lastId === pilotId,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
