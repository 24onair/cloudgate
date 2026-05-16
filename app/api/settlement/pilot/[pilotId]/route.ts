/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/tenant";
import { loadShareSettings, resolveShare, pilotAmountForBooking } from "@/lib/settlement/compute";

// GET /api/settlement/pilot/[pilotId]?period=YYYY-MM
// 관리자 시점의 파일럿 상세: 비행 명세 + 정산 상태 + 지급 이력
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ pilotId: string }> },
) {
  try {
    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();
    const { pilotId } = await params;
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") ?? new Date().toISOString().slice(0, 7);
    const fromDate = `${period}-01`;
    const toDate = lastDayOfMonth(period);

    if (!pilotId) return NextResponse.json({ error: "pilotId 누락" }, { status: 400 });

    const [pilotResp, shareSettings] = await Promise.all([
      supabase
        .from("pilots")
        .select("id, name, phone, photo_url, rate_per_flight, bank_name, account_number, account_holder")
        .eq("tenant_id", tenantId)
        .eq("id", pilotId)
        .maybeSingle(),
      loadShareSettings(supabase),
    ]);

    if (pilotResp.error) return NextResponse.json({ error: pilotResp.error.message }, { status: 500 });
    if (!pilotResp.data) return NextResponse.json({ error: "파일럿을 찾을 수 없습니다" }, { status: 404 });

    const pilot = pilotResp.data;
    const { share, isOverride, reason } = resolveShare(pilotId, shareSettings.defaultShare, shareSettings.overrides);

    // 1) 이 파일럿이 배정된 완료 예약 (booking_pilots + bookings)
    const { data: bpRows } = await supabase
      .from("booking_pilots")
      .select("booking_id, bookings(id, booking_no, customer_name, product_name, flight_date, flight_time, total_price, status)")
      .eq("tenant_id", tenantId)
      .eq("pilot_id", pilotId);

    const bookingIds = (bpRows ?? [])
      .map((bp: any) => bp.bookings?.id)
      .filter(Boolean) as string[];

    // 동승 파일럿 수 계산을 위해 같은 booking_id의 booking_pilots 행 수 조회
    const pilotCountMap: Record<string, number> = {};
    if (bookingIds.length > 0) {
      const { data: countRows } = await supabase
        .from("booking_pilots")
        .select("booking_id")
        .eq("tenant_id", tenantId)
        .in("booking_id", bookingIds);
      for (const r of countRows ?? []) {
        pilotCountMap[r.booking_id] = (pilotCountMap[r.booking_id] ?? 0) + 1;
      }
    }

    // 레거시: bookings.pilot_id만 있는 경우
    const { data: legacyRows } = await supabase
      .from("bookings")
      .select("id, booking_no, customer_name, product_name, flight_date, flight_time, total_price, status")
      .eq("tenant_id", tenantId)
      .eq("pilot_id", pilotId)
      .gte("flight_date", fromDate)
      .lte("flight_date", toDate)
      .eq("status", "completed");

    const flightSet = new Map<string, any>();
    for (const bp of bpRows ?? []) {
      const b = bp.bookings;
      if (!b || b.status !== "completed") continue;
      if (b.flight_date < fromDate || b.flight_date > toDate) continue;
      flightSet.set(b.id, {
        ...b,
        pilot_count: pilotCountMap[b.id] ?? 1,
      });
    }
    for (const b of legacyRows ?? []) {
      if (flightSet.has(b.id)) continue;
      flightSet.set(b.id, { ...b, pilot_count: 1 });
    }

    const flights = Array.from(flightSet.values())
      .sort((a, b) => `${a.flight_date}T${a.flight_time}`.localeCompare(`${b.flight_date}T${b.flight_time}`))
      .map((b) => ({
        booking_id: b.id,
        booking_no: b.booking_no,
        flight_date: b.flight_date,
        flight_time: b.flight_time,
        customer_name: b.customer_name,
        product_name: b.product_name,
        total_price: b.total_price ?? 0,
        pilot_count: b.pilot_count,
        pilot_amount: pilotAmountForBooking(b.total_price ?? 0, b.pilot_count, share),
      }));

    const totalRevenue = flights.reduce((s, f) => s + (f.total_price / f.pilot_count), 0);
    const totalAmount = flights.reduce((s, f) => s + f.pilot_amount, 0);
    const summary = {
      flight_count: flights.length,
      total_revenue: Math.round(totalRevenue),
      total_amount: totalAmount,
    };

    // 2) settlements 행 (현재 월)
    const { data: settlement } = await supabase
      .from("settlements")
      .select("status, confirmed_at, paid_at, pay_method, pay_memo, share_snapshot, memo, total_amount, flight_count, updated_at")
      .eq("tenant_id", tenantId)
      .eq("pilot_id", pilotId)
      .eq("year_month", period)
      .maybeSingle();

    // 3) 지급 이력 (paid 상태인 과거 정산 12건)
    const { data: history } = await supabase
      .from("settlements")
      .select("year_month, total_amount, flight_count, paid_at, pay_method, pay_memo")
      .eq("tenant_id", tenantId)
      .eq("pilot_id", pilotId)
      .eq("status", "paid")
      .order("paid_at", { ascending: false })
      .limit(12);

    return NextResponse.json({
      pilot,
      period,
      share,
      isOverride,
      override_reason: reason ?? null,
      flights,
      summary,
      settlement,
      history: history ?? [],
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

function lastDayOfMonth(period: string): string {
  const [y, m] = period.split("-").map(Number);
  return new Date(y, m, 0).toISOString().slice(0, 10);
}
