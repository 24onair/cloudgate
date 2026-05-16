/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/tenant";
import { aggregatePilots, loadShareSettings } from "@/lib/settlement/compute";

// ── GET /api/settlement ─────────────────────────────────────────
// ?type=daily   &from=YYYY-MM-DD&to=YYYY-MM-DD  → 날짜별 매출 집계
// ?type=pilots  &from=YYYY-MM-DD&to=YYYY-MM-DD  → 파일럿별 비행 집계
// ?type=summary &period=YYYY-MM                 → 월 요약 (KPI)
export async function GET(req: NextRequest) {
  try {
    const supabase  = createServerClient() as any;
    const tenantId  = await getTenantId();
    const { searchParams } = new URL(req.url);
    const type   = searchParams.get("type") ?? "daily";
    const period = searchParams.get("period") ?? new Date().toISOString().slice(0, 7);
    const from   = searchParams.get("from") ?? `${period}-01`;
    const to     = searchParams.get("to")   ?? lastDayOfMonth(period);

    const { data: bookings, error: bErr } = await supabase
      .from("bookings")
      .select("id, flight_date, flight_time, status, total_price, deposit_amount, balance_amount, headcount, product_name, pilot_id, pilots(id, name)")
      .eq("tenant_id", tenantId)
      .gte("flight_date", from)
      .lte("flight_date", to)
      .neq("status", "cancelled")
      .order("flight_date", { ascending: true });

    if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 });
    const rows: any[] = bookings ?? [];

    const { data: costs } = await supabase
      .from("costs")
      .select("date, category, amount")
      .eq("tenant_id", tenantId)
      .gte("date", from)
      .lte("date", to);
    const costRows: any[] = costs ?? [];

    if (type === "daily") {
      const map: Record<string, { date: string; flights: number; revenue: number; deposit: number; costs: number }> = {};
      for (const b of rows) {
        const d = b.flight_date;
        if (!map[d]) map[d] = { date: d, flights: 0, revenue: 0, deposit: 0, costs: 0 };
        if (b.status === "completed") {
          map[d].flights++;
          map[d].revenue  += b.total_price ?? 0;
          map[d].deposit  += b.deposit_amount ?? 0;
        }
      }
      for (const c of costRows) {
        if (!map[c.date]) map[c.date] = { date: c.date, flights: 0, revenue: 0, deposit: 0, costs: 0 };
        map[c.date].costs += c.amount ?? 0;
      }
      const daily = Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
      return NextResponse.json(daily);
    }

    if (type === "pilots") {
      const completed = rows.filter((b) => b.status === "completed");
      const completedIds = completed.map((b) => b.id as string);

      // booking_pilots + 분배율 설정 + settlements 동시 조회
      const [bpResp, shareSettings, settlResp] = await Promise.all([
        completedIds.length > 0
          ? supabase.from("booking_pilots").select("pilot_id, booking_id, pilots(id, name)").eq("tenant_id", tenantId).in("booking_id", completedIds)
          : Promise.resolve({ data: [] }),
        loadShareSettings(supabase),
        supabase.from("settlements").select("pilot_id, year_month, status, confirmed_at, paid_at, pay_method, total_amount").eq("tenant_id", tenantId).gte("year_month", from.slice(0, 7)).lte("year_month", to.slice(0, 7)),
      ]);

      const aggregates = aggregatePilots({
        completedBookings: completed,
        bookingPilots: bpResp.data ?? [],
        defaultShare: shareSettings.defaultShare,
        overrides: shareSettings.overrides,
      });

      // 단일 월 조회일 때만 settlement 상태 매핑 (다중 월 시 조회 화면이 month별로 분리되지 않으므로 의미 없음)
      const fromYM = from.slice(0, 7);
      const toYM   = to.slice(0, 7);
      const isSingleMonth = fromYM === toYM;
      const settlMap: Record<string, any> = {};
      if (isSingleMonth) {
        for (const s of settlResp.data ?? []) {
          if (s.year_month === fromYM) settlMap[s.pilot_id] = s;
        }
      }

      const result = aggregates.map((p) => {
        const s = settlMap[p.pilot_id];
        return {
          ...p,
          rate_per_flight: 0, // amount 산출에서 제외 — 호환을 위해 0 노출
          year_month: isSingleMonth ? fromYM : null,
          settlement_status: s?.status ?? null,        // null | 'calculating' | 'confirmed' | 'paid'
          confirmed_at: s?.confirmed_at ?? null,
          paid_at: s?.paid_at ?? null,
          pay_method: s?.pay_method ?? null,
        };
      });

      return NextResponse.json(result);
    }

    if (type === "summary") {
      const completed = rows.filter((b) => b.status === "completed");
      const revenue   = completed.reduce((s, b) => s + (b.total_price ?? 0), 0);
      const flights   = completed.length;
      const totalCosts = costRows.reduce((s, c) => s + (c.amount ?? 0), 0);
      const profit     = revenue - totalCosts;

      const prevPeriod = prevMonth(period);
      const { data: prevBookings } = await supabase
        .from("bookings")
        .select("total_price, status")
        .eq("tenant_id", tenantId)
        .gte("flight_date", `${prevPeriod}-01`)
        .lte("flight_date", lastDayOfMonth(prevPeriod))
        .eq("status", "completed");
      const prevRevenue = (prevBookings ?? []).reduce((s: number, b: any) => s + (b.total_price ?? 0), 0);

      return NextResponse.json({ revenue, flights, costs: totalCosts, profit, prevRevenue });
    }

    return NextResponse.json({ error: "unknown type" }, { status: 400 });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// ── POST /api/settlement ────────────────────────────────────────
// 정산 상태 전환 (단일/일괄). 본문:
//   { action: 'confirm'|'pay'|'revert', pilot_id, year_month, ... }
//   { action: 'confirm'|'pay'|'revert', pilot_ids: string[], year_month, ... }
//
// confirm: settlements 행 upsert → status='confirmed', confirmed_at=now, total_amount/share_snapshot 저장
// pay:     status='confirmed' → 'paid', paid_at=now, pay_method/pay_memo 저장
// revert:  paid → confirmed (paid_at/pay_method 초기화) 또는 confirmed → calculating
export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();
    const body = await req.json();
    const action: string = body?.action;
    const yearMonth: string = body?.year_month;
    const pilotIds: string[] = Array.isArray(body?.pilot_ids)
      ? body.pilot_ids
      : (body?.pilot_id ? [body.pilot_id] : []);

    if (!["confirm", "pay", "revert"].includes(action)) {
      return NextResponse.json({ error: "action은 confirm|pay|revert 중 하나여야 합니다" }, { status: 400 });
    }
    if (!yearMonth || !/^\d{4}-\d{2}$/.test(yearMonth)) {
      return NextResponse.json({ error: "year_month는 YYYY-MM 형식이어야 합니다" }, { status: 400 });
    }
    if (pilotIds.length === 0) {
      return NextResponse.json({ error: "pilot_id 또는 pilot_ids가 필요합니다" }, { status: 400 });
    }

    const fromDate = `${yearMonth}-01`;
    const toDate   = lastDayOfMonth(yearMonth);

    // 분배율 설정 + 기존 settlements 행 한 번에 로드
    const [shareSettings, existingResp] = await Promise.all([
      loadShareSettings(supabase),
      supabase.from("settlements").select("*").eq("tenant_id", tenantId).eq("year_month", yearMonth).in("pilot_id", pilotIds),
    ]);
    const existingMap: Record<string, any> = {};
    for (const s of existingResp.data ?? []) existingMap[s.pilot_id] = s;

    const results: { pilot_id: string; ok: boolean; status?: string; error?: string }[] = [];

    if (action === "confirm") {
      // 비행 데이터 일괄 조회 → 파일럿별 amount 재계산 (서버 신뢰)
      const { data: completed } = await supabase
        .from("bookings")
        .select("id, total_price, pilot_id, pilots(id, name)")
        .eq("tenant_id", tenantId)
        .gte("flight_date", fromDate)
        .lte("flight_date", toDate)
        .eq("status", "completed");

      const completedIds = (completed ?? []).map((b: any) => b.id);
      const { data: bpRows } = completedIds.length > 0
        ? await supabase.from("booking_pilots").select("pilot_id, booking_id, pilots(id, name)").eq("tenant_id", tenantId).in("booking_id", completedIds)
        : { data: [] };

      const aggregates = aggregatePilots({
        completedBookings: completed ?? [],
        bookingPilots: bpRows ?? [],
        defaultShare: shareSettings.defaultShare,
        overrides: shareSettings.overrides,
      });
      const aggMap: Record<string, typeof aggregates[number]> = {};
      for (const a of aggregates) aggMap[a.pilot_id] = a;

      const lockedAt = new Date().toISOString();
      for (const pid of pilotIds) {
        const agg = aggMap[pid];
        if (!agg) {
          results.push({ pilot_id: pid, ok: false, error: "비행 기록 없음" });
          continue;
        }
        const existing = existingMap[pid];
        if (existing && existing.status === "paid") {
          results.push({ pilot_id: pid, ok: false, error: "이미 지급 완료된 정산은 다시 확정할 수 없습니다" });
          continue;
        }

        const upsertPayload: any = {
          tenant_id: tenantId,
          pilot_id: pid,
          year_month: yearMonth,
          flight_count: agg.flights,
          rate_per_flight: 0, // 분배율 기반이라 0
          total_amount: agg.amount,
          status: "confirmed",
          confirmed_at: lockedAt,
          share_snapshot: {
            share: agg.share,
            isOverride: agg.isOverride,
            locked_at: lockedAt,
          },
          updated_at: lockedAt,
        };
        // memo는 덮어쓰지 않음 (관리자 메모 보존)
        const { error } = await supabase
          .from("settlements")
          .upsert(upsertPayload, { onConflict: "pilot_id,year_month" });
        if (error) {
          results.push({ pilot_id: pid, ok: false, error: error.message });
          continue;
        }
        results.push({ pilot_id: pid, ok: true, status: "confirmed" });
      }
    } else if (action === "pay") {
      const paidAt = new Date().toISOString();
      const payMethod: string | null = body?.pay_method ?? null;
      const payMemo: string | null = body?.pay_memo ?? null;

      for (const pid of pilotIds) {
        const existing = existingMap[pid];
        if (!existing || existing.status !== "confirmed") {
          results.push({ pilot_id: pid, ok: false, error: "확정된 정산만 지급할 수 있습니다" });
          continue;
        }
        const { error } = await supabase
          .from("settlements")
          .update({ status: "paid", paid_at: paidAt, pay_method: payMethod, pay_memo: payMemo, updated_at: paidAt })
          .eq("id", existing.id);
        if (error) {
          results.push({ pilot_id: pid, ok: false, error: error.message });
          continue;
        }
        results.push({ pilot_id: pid, ok: true, status: "paid" });
      }
    } else if (action === "revert") {
      for (const pid of pilotIds) {
        const existing = existingMap[pid];
        if (!existing) {
          results.push({ pilot_id: pid, ok: false, error: "되돌릴 정산이 없습니다" });
          continue;
        }
        const updatedAt = new Date().toISOString();
        let patch: any = { updated_at: updatedAt };
        let nextStatus = "calculating";
        if (existing.status === "paid") {
          patch = { ...patch, status: "confirmed", paid_at: null, pay_method: null, pay_memo: null };
          nextStatus = "confirmed";
        } else if (existing.status === "confirmed") {
          patch = { ...patch, status: "calculating", confirmed_at: null };
          nextStatus = "calculating";
        } else {
          results.push({ pilot_id: pid, ok: false, error: "calculating 상태는 되돌릴 수 없습니다" });
          continue;
        }
        const { error } = await supabase.from("settlements").update(patch).eq("id", existing.id);
        if (error) {
          results.push({ pilot_id: pid, ok: false, error: error.message });
          continue;
        }
        results.push({ pilot_id: pid, ok: true, status: nextStatus });
      }
    }

    const okCount = results.filter((r) => r.ok).length;
    return NextResponse.json({ ok: okCount === results.length, action, results, count: okCount });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// ── PATCH /api/settlement ───────────────────────────────────────
// 관리자 메모 저장 전용. { pilot_id, year_month, memo }
export async function PATCH(req: NextRequest) {
  try {
    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();
    const body = await req.json();
    const { pilot_id, year_month, memo } = body ?? {};
    if (!pilot_id || !year_month) {
      return NextResponse.json({ error: "pilot_id와 year_month가 필요합니다" }, { status: 400 });
    }
    // upsert (행 없으면 calculating 상태로 생성)
    const { data: existing } = await supabase
      .from("settlements")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("pilot_id", pilot_id)
      .eq("year_month", year_month)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("settlements")
        .update({ memo: memo ?? null, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      const { error } = await supabase.from("settlements").insert({
        tenant_id: tenantId,
        pilot_id,
        year_month,
        flight_count: 0,
        rate_per_flight: 0,
        total_amount: 0,
        status: "calculating",
        memo: memo ?? null,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// ── 헬퍼 ────────────────────────────────────────────────────────
function lastDayOfMonth(period: string) {
  const [y, m] = period.split("-").map(Number);
  return new Date(y, m, 0).toISOString().slice(0, 10);
}

function prevMonth(period: string) {
  const [y, m] = period.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

