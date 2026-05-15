/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/tenant";

// ── GET /api/finance/stats/monthly ─────────────────────────────
// ?from=YYYY-MM&to=YYYY-MM      (시즌 범위, 예: 2025-11 ~ 2026-05)
// ?year=YYYY                    (해당 연도 전체 1~12월)
// 둘 다 생략 시: 오늘 포함 최근 7개월
//
// 응답:
// [{
//   year, month, label, revenue, cost, flights, isCurrent
// }, ...]
export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();
    const { searchParams } = new URL(req.url);

    const yearParam = searchParams.get("year");
    const fromParam = searchParams.get("from");
    const toParam   = searchParams.get("to");

    const today      = new Date();
    const todayYM    = today.toISOString().slice(0, 7);

    let fromYM: string;
    let toYM: string;
    if (yearParam) {
      const y = parseInt(yearParam, 10);
      fromYM = `${y}-01`;
      toYM   = `${y}-12`;
    } else if (fromParam || toParam) {
      fromYM = fromParam ?? todayYM;
      toYM   = toParam   ?? todayYM;
    } else {
      const start = new Date(today.getFullYear(), today.getMonth() - 6, 1);
      fromYM = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;
      toYM   = todayYM;
    }

    const fromDate = `${fromYM}-01`;
    const toDate   = lastDayOfMonth(toYM);

    // ── 완료 예약 조회 ──
    const { data: bookings, error: bErr } = await supabase
      .from("bookings")
      .select("flight_date, status, total_price")
      .eq("tenant_id", tenantId)
      .gte("flight_date", fromDate)
      .lte("flight_date", toDate)
      .eq("status", "completed");

    if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 });

    // ── 변동비 조회 ──
    const { data: costs, error: cErr } = await supabase
      .from("costs")
      .select("date, amount")
      .eq("tenant_id", tenantId)
      .gte("date", fromDate)
      .lte("date", toDate);

    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

    type MonthBucket = { ym: string; revenue: number; cost: number; flights: number };
    const map: Record<string, MonthBucket> = {};

    // 범위 내 모든 월을 0으로 초기화 (데이터 없는 달도 표시)
    for (const ym of monthsBetween(fromYM, toYM)) {
      map[ym] = { ym, revenue: 0, cost: 0, flights: 0 };
    }

    for (const b of (bookings ?? []) as any[]) {
      const ym = (b.flight_date as string).slice(0, 7);
      if (!map[ym]) map[ym] = { ym, revenue: 0, cost: 0, flights: 0 };
      map[ym].revenue += (b.total_price as number) ?? 0;
      map[ym].flights += 1;
    }

    for (const c of (costs ?? []) as any[]) {
      const ym = (c.date as string).slice(0, 7);
      if (!map[ym]) map[ym] = { ym, revenue: 0, cost: 0, flights: 0 };
      map[ym].cost += (c.amount as number) ?? 0;
    }

    const result = Object.values(map)
      .sort((a, b) => a.ym.localeCompare(b.ym))
      .map((m) => {
        const [y, mo] = m.ym.split("-").map(Number);
        const isCurrent = m.ym === todayYM;
        return {
          year: y,
          month: mo,
          label: isCurrent ? `${mo}월(현재)` : `${mo}월`,
          revenue: m.revenue,
          cost:    m.cost,
          flights: m.flights,
          isCurrent,
        };
      });

    return NextResponse.json(result);
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// ── 헬퍼 ───────────────────────────────────────────────────────
function lastDayOfMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m, 0).toISOString().slice(0, 10);
}

function monthsBetween(fromYM: string, toYM: string): string[] {
  const [fy, fm] = fromYM.split("-").map(Number);
  const [ty, tm] = toYM.split("-").map(Number);
  const out: string[] = [];
  let y = fy, m = fm;
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return out;
}
