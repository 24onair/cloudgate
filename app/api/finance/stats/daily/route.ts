/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/tenant";

// ── GET /api/finance/stats/daily ───────────────────────────────
// ?from=YYYY-MM-DD&to=YYYY-MM-DD
// 기본값: 오늘 포함 최근 7일
//
// 응답:
// [{
//   date: "2026-05-01",
//   flights: number,
//   revenue: number,
//   products: { [productKey]: { product_id, name, revenue, count } },
//   costs:    { [category]:  number }
// }, ...]
export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();
    const { searchParams } = new URL(req.url);

    const today = new Date().toISOString().slice(0, 10);
    const defaultFrom = (() => {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      return d.toISOString().slice(0, 10);
    })();
    const from = searchParams.get("from") ?? defaultFrom;
    const to   = searchParams.get("to")   ?? today;

    // ── 완료 예약 조회 ──
    const { data: bookings, error: bErr } = await supabase
      .from("bookings")
      .select("flight_date, status, total_price, product_id, product_name")
      .eq("tenant_id", tenantId)
      .gte("flight_date", from)
      .lte("flight_date", to)
      .eq("status", "completed");

    if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 });

    // ── 비용 조회 ──
    const { data: costs, error: cErr } = await supabase
      .from("costs")
      .select("date, category, amount")
      .eq("tenant_id", tenantId)
      .gte("date", from)
      .lte("date", to);

    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

    type ProductBucket = { product_id: string | null; name: string; revenue: number; count: number };
    type DayBucket = {
      date: string;
      flights: number;
      revenue: number;
      products: Record<string, ProductBucket>;
      costs: Record<string, number>;
    };

    const dayMap: Record<string, DayBucket> = {};
    const ensure = (date: string): DayBucket => {
      if (!dayMap[date]) dayMap[date] = { date, flights: 0, revenue: 0, products: {}, costs: {} };
      return dayMap[date];
    };

    for (const b of (bookings ?? []) as any[]) {
      const day = ensure(b.flight_date as string);
      const revenue = (b.total_price as number) ?? 0;
      day.flights += 1;
      day.revenue += revenue;

      const key = (b.product_id as string | null) ?? (b.product_name as string) ?? "unknown";
      const name = (b.product_name as string) ?? "기타";
      if (!day.products[key]) {
        day.products[key] = { product_id: (b.product_id as string | null) ?? null, name, revenue: 0, count: 0 };
      }
      day.products[key].revenue += revenue;
      day.products[key].count   += 1;
    }

    for (const c of (costs ?? []) as any[]) {
      const day = ensure(c.date as string);
      const cat = (c.category as string) ?? "other";
      day.costs[cat] = (day.costs[cat] ?? 0) + ((c.amount as number) ?? 0);
    }

    const result = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));
    return NextResponse.json(result);
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
