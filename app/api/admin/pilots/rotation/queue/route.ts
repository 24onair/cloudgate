/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * GET /api/admin/pilots/rotation/queue?date=YYYY-MM-DD
 *
 * 큐 포인터 기반 다음 배정 순서를 반환.
 * - pilot_rotation_state.last_assigned_pilot_id를 기준으로
 *   effective 순번(override > rotation_order) 배열에서 그 다음 사람이 queue_idx=0.
 * - 그 날 휴무/기타(off/other)는 큐에서 제외.
 *
 * 응답:
 * {
 *   date,
 *   last_assigned_pilot_id: string | null,
 *   last_assigned_name: string | null,
 *   last_assigned_at: string | null,
 *   has_override: boolean,
 *   total: number,
 *   pilots: [
 *     { id, name, rotation_order, override_order, effective_order, queue_idx }
 *   ]  // queue_idx 오름차순 (0 = 다음 차례)
 * }
 *
 * UI 사용처:
 *  - 모바일 today 보드의 "여유 파일럿" 정렬·표시
 *  - PC 순번 관리의 "마지막 배정자 / 다음 차례" 헤더
 *  - 파일럿 포털 "내 순번"의 다음 차례까지 N명 계산용
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/tenant";
import { requireAdmin } from "@/lib/auth/session";

function validDate(s: string | null): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function todayISO(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || todayISO();
    if (!validDate(date)) {
      return NextResponse.json({ error: "date(YYYY-MM-DD)" }, { status: 400 });
    }

    const [
      { data: pilots },
      { data: schedules },
      { data: overrides },
      { data: state },
    ] = await Promise.all([
      supabase
        .from("pilots")
        .select("id, name, rotation_order")
        .eq("tenant_id", tenantId)
        .eq("status", "active"),
      supabase
        .from("pilot_schedules")
        .select("pilot_id, type")
        .eq("tenant_id", tenantId)
        .eq("date", date),
      supabase
        .from("pilot_rotation_overrides")
        .select("pilot_id, order_idx")
        .eq("tenant_id", tenantId)
        .eq("date", date),
      supabase
        .from("pilot_rotation_state")
        .select("last_assigned_pilot_id, last_assigned_at")
        .eq("tenant_id", tenantId)
        .maybeSingle(),
    ]);

    const off = new Set<string>();
    for (const s of (schedules ?? []) as Array<{ pilot_id: string; type: string }>) {
      if (s.type === "off" || s.type === "other") off.add(s.pilot_id);
    }

    const overrideMap: Record<string, number> = {};
    for (const o of overrides ?? []) overrideMap[o.pilot_id] = o.order_idx;

    // 가용 파일럿만 큐 산정에 포함
    const available = (pilots ?? [])
      .filter((p: any) => !off.has(p.id))
      .map((p: any) => ({
        id: p.id as string,
        name: (p.name ?? "") as string,
        rotation_order: (p.rotation_order ?? null) as number | null,
        override_order: (overrideMap[p.id] ?? null) as number | null,
        effective_order: (overrideMap[p.id] ?? p.rotation_order ?? null) as number | null,
      }));

    // effective_order 오름차순(동률은 이름)으로 정렬한 큐 배열
    const ordered = [...available].sort((a, b) => {
      const ao = a.effective_order ?? Number.MAX_SAFE_INTEGER;
      const bo = b.effective_order ?? Number.MAX_SAFE_INTEGER;
      if (ao !== bo) return ao - bo;
      return a.name.localeCompare(b.name);
    });

    const N = ordered.length;
    const lastId: string | null = state?.last_assigned_pilot_id ?? null;
    let startIdx = 0;
    if (lastId) {
      const idx = ordered.findIndex((p) => p.id === lastId);
      // 마지막 배정자가 오늘 가용 풀에 없으면(휴가 등) 0부터.
      startIdx = idx >= 0 ? (idx + 1) % N : 0;
    }

    // queue_idx 부여 후 다시 큐 순으로 정렬
    const withQueue = ordered.map((p, i) => ({
      ...p,
      queue_idx: N === 0 ? 0 : (i - startIdx + N) % N,
    }));
    withQueue.sort((a, b) => {
      if (a.queue_idx !== b.queue_idx) return a.queue_idx - b.queue_idx;
      return a.name.localeCompare(b.name);
    });

    // 마지막 배정자 이름 (전체 파일럿 풀에서 찾음 — 오늘 휴가여도 표시 가능)
    let lastName: string | null = null;
    if (lastId) {
      const found = (pilots ?? []).find((p: any) => p.id === lastId);
      lastName = found?.name ?? null;
    }

    return NextResponse.json({
      date,
      last_assigned_pilot_id: lastId,
      last_assigned_name: lastName,
      last_assigned_at: state?.last_assigned_at ?? null,
      has_override: Object.keys(overrideMap).length > 0,
      total: N,
      pilots: withQueue,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
