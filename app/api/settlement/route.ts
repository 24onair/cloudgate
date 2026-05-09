/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/tenant";

// ── GET /api/settlement ─────────────────────────────────────────
// ?type=daily   &from=YYYY-MM-DD&to=YYYY-MM-DD  → 날짜별 매출 집계
// ?type=pilots  &period=YYYY-MM                 → 파일럿별 비행 집계
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

    // ── 기간 내 완료 예약 조회 ──
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

    // ── 비용 조회 ──
    const { data: costs } = await supabase
      .from("costs")
      .select("date, category, amount")
      .eq("tenant_id", tenantId)
      .gte("date", from)
      .lte("date", to);
    const costRows: any[] = costs ?? [];

    if (type === "daily") {
      // 날짜별 집계
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
      // 파일럿별 집계
      const pilotMap: Record<string, { pilot_id: string; name: string; flights: number; revenue: number }> = {};

      for (const b of rows) {
        if (b.status !== "completed") continue;
        const pid   = b.pilot_id ?? "unassigned";
        const pname = b.pilots?.name ?? "미배정";
        if (!pilotMap[pid]) pilotMap[pid] = { pilot_id: pid, name: pname, flights: 0, revenue: 0 };
        pilotMap[pid].flights++;
        pilotMap[pid].revenue += b.total_price ?? 0;
      }

      // pilots 테이블에서 단가 조회
      const pilotIds = Object.keys(pilotMap).filter((id) => id !== "unassigned");
      let rates: Record<string, number> = {};
      if (pilotIds.length > 0) {
        const { data: pilotsData } = await supabase
          .from("pilots")
          .select("id, rate_per_flight")
          .in("id", pilotIds);
        for (const p of pilotsData ?? []) rates[p.id] = p.rate_per_flight ?? 30000;
      }

      const result = Object.values(pilotMap).map((p) => ({
        ...p,
        rate_per_flight: rates[p.pilot_id] ?? 30000,
        amount: (rates[p.pilot_id] ?? 30000) * p.flights,
      }));

      return NextResponse.json(result);
    }

    if (type === "summary") {
      const completed = rows.filter((b) => b.status === "completed");
      const revenue   = completed.reduce((s, b) => s + (b.total_price ?? 0), 0);
      const flights   = completed.length;
      const totalCosts = costRows.reduce((s, c) => s + (c.amount ?? 0), 0);
      const profit     = revenue - totalCosts;

      // 전월 비교
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
