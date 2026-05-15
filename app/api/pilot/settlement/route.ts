/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/tenant";

const KR_DAYS = ["일", "월", "화", "수", "목", "금", "토"];

async function verifyPilotToken(token: string, secret: string): Promise<string | null> {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [pilotIdHex, sigHex] = parts;
  if (pilotIdHex.length !== 32) return null;
  try {
    const key = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(pilotIdHex));
    const expected = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0")).join("");
    if (expected !== sigHex) return null;
    return `${pilotIdHex.slice(0,8)}-${pilotIdHex.slice(8,12)}-${pilotIdHex.slice(12,16)}-${pilotIdHex.slice(16,20)}-${pilotIdHex.slice(20)}`;
  } catch { return null; }
}

// GET /api/pilot/settlement
// Returns MonthRecord[] for the logged-in pilot, derived from real flight_records + settlements tables
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("gureum_pilot_session")?.value;
    if (!token) return NextResponse.json({ error: "미인증" }, { status: 401 });
    const secret = process.env.SESSION_SECRET ?? "dev-secret-change-in-production";
    const pilotId = await verifyPilotToken(token, secret);
    if (!pilotId) return NextResponse.json({ error: "세션 만료" }, { status: 401 });

    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();

    // 1. 파일럿 정산 단가
    const { data: pilotRow } = await supabase
      .from("pilots")
      .select("rate_per_flight")
      .eq("id", pilotId)
      .single();
    const rate: number = pilotRow?.rate_per_flight ?? 30000;

    // 2. settlements 테이블 (상태·지급일)
    const { data: settlRows } = await supabase
      .from("settlements")
      .select("year_month, status, paid_at, total_amount")
      .eq("tenant_id", tenantId)
      .eq("pilot_id", pilotId)
      .order("year_month", { ascending: false });

    const settlMap: Record<string, any> = {};
    for (const s of settlRows ?? []) {
      settlMap[s.year_month] = s;
    }

    // 3. flight_records — 이 파일럿의 전체 비행 이력
    const { data: records } = await supabase
      .from("flight_records")
      .select("flight_date, landing_at, booking_id, bookings(booking_no, customer_name, product_name, headcount, flight_time, options)")
      .eq("tenant_id", tenantId)
      .eq("pilot_id", pilotId)
      .order("flight_date", { ascending: false });

    // 4. 날짜별 집계
    const dayMap: Record<string, { count: number }> = {};
    const monthSet = new Set<string>();

    for (const r of records ?? []) {
      const d: string = r.flight_date;
      const m = d.slice(0, 7);
      monthSet.add(m);
      if (!dayMap[d]) dayMap[d] = { count: 0 };
      dayMap[d].count++;
    }

    // 5. MonthRecord 배열 생성 (비행 있는 달 + settlements 달 합집합)
    for (const m of Object.keys(settlMap)) monthSet.add(m);
    const monthsSorted = Array.from(monthSet).sort().reverse();

    const months = monthsSorted.map((month) => {
      const [y, mo] = month.split("-").map(Number);
      const label = `${y}년 ${mo}월`;

      // 이 월에 해당하는 날짜들
      const days = Object.entries(dayMap)
        .filter(([d]) => d.startsWith(month + "-"))
        .map(([d, { count }]) => {
          const dow = new Date(d + "T00:00:00").getDay();
          return {
            date: d,
            day: KR_DAYS[dow],
            count,
            subtotal: count * rate,
          };
        })
        .sort((a, b) => a.date.localeCompare(b.date));

      const sRow = settlMap[month];
      // draft(calculating) / confirmed / paid 매핑
      const rawStatus: string = sRow?.status ?? "calculating";
      const status = rawStatus === "paid" ? "paid"
        : rawStatus === "confirmed" ? "confirmed"
        : "draft";

      // 지급 예정일: 다음달 첫째 주 토요일
      const nextMonth = new Date(y, mo, 1);
      const nextMonthMo = nextMonth.getMonth(); // 0-indexed
      const sat = new Date(y, mo, 1);
      while (sat.getDay() !== 6) sat.setDate(sat.getDate() + 1);
      const payment_due = sat.toISOString().slice(0, 10);

      return {
        month,
        label,
        status,
        rate,
        payment_due,
        paid_at: sRow?.paid_at ? String(sRow.paid_at).slice(0, 10) : undefined,
        days,
      };
    });

    return NextResponse.json({ months, rate });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
