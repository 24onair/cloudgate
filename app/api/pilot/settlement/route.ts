/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/tenant";
import { loadShareSettings, resolveShare, pilotAmountForBooking } from "@/lib/settlement/compute";

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
// 분배비율관리 설정 기반으로 파일럿 정산 계산
// 계산식: booking.total_price ÷ 해당예약 배정파일럿수 × 파일럿지분%
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("gureum_pilot_session")?.value;
    if (!token) return NextResponse.json({ error: "미인증" }, { status: 401 });
    const secret = process.env.SESSION_SECRET ?? "dev-secret-change-in-production";
    const pilotId = await verifyPilotToken(token, secret);
    if (!pilotId) return NextResponse.json({ error: "세션 만료" }, { status: 401 });

    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();

    // ── 1. 분배비율 + 지급일정 설정 로드 ─────────────────────────
    const [shareSettings, psRow] = await Promise.all([
      loadShareSettings(supabase),
      supabase.from("site_settings").select("value").eq("key", "payment_schedule").maybeSingle(),
    ]);

    // 지급 예정일 설정 (기본: 월 지급 다음달 10일)
    const psConfig: { type: string; monthlyDay: number; weeklyDow: number } =
      psRow.data?.value ?? { type: "monthly", monthlyDay: 10, weeklyDow: 5 };

    const { share: pilotShare, isOverride } = resolveShare(pilotId, shareSettings.defaultShare, shareSettings.overrides);

    // ── 2. settlements 테이블 (상태·지급일) ───────────────────────
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

    // ── 3. flight_records + 예약 정보 + booking_pilots 조회 ───────
    const { data: records } = await supabase
      .from("flight_records")
      .select(`
        id,
        flight_date,
        landing_at,
        booking_id,
        bookings (
          id,
          booking_no,
          customer_name,
          product_name,
          headcount,
          flight_time,
          total_price,
          options,
          booking_pilots ( pilot_id )
        )
      `)
      .eq("tenant_id", tenantId)
      .eq("pilot_id", pilotId)
      .order("flight_date", { ascending: false });

    // ── 4. 날짜별 집계 (분배비율 적용) ───────────────────────────
    // date → { count, amount }
    const dayMap: Record<string, { count: number; amount: number }> = {};
    const monthSet = new Set<string>();

    for (const r of records ?? []) {
      const d: string = r.flight_date;
      const m = d.slice(0, 7);
      monthSet.add(m);

      const booking = r.bookings;
      const totalPrice: number = booking?.total_price ?? 0;

      // 이 예약에 배정된 파일럿 수 (없으면 1)
      const numPilots: number = booking?.booking_pilots?.length || 1;

      // 파일럿 1인당 분배 금액 (compute.ts 공통 함수)
      const pilotAmount = pilotAmountForBooking(totalPrice, numPilots, pilotShare);

      if (!dayMap[d]) dayMap[d] = { count: 0, amount: 0 };
      dayMap[d].count++;
      dayMap[d].amount += pilotAmount;
    }

    // ── 5. MonthRecord 배열 생성 ──────────────────────────────────
    for (const m of Object.keys(settlMap)) monthSet.add(m);
    const monthsSorted = Array.from(monthSet).sort().reverse();

    const months = monthsSorted.map((month) => {
      const [y, mo] = month.split("-").map(Number);
      const label = `${y}년 ${mo}월`;

      const days = Object.entries(dayMap)
        .filter(([d]) => d.startsWith(month + "-"))
        .map(([d, { count, amount }]) => {
          const dow = new Date(d + "T00:00:00").getDay();
          return {
            date: d,
            day: KR_DAYS[dow],
            count,
            subtotal: amount,
          };
        })
        .sort((a, b) => a.date.localeCompare(b.date));

      const sRow = settlMap[month];
      const rawStatus: string = sRow?.status ?? "calculating";
      const status = rawStatus === "paid" ? "paid"
        : rawStatus === "confirmed" ? "confirmed"
        : "draft";

      // 지급 예정일: 설정에 따라 계산
      // new Date(y, mo, 1) = 다음달 1일 (JS month 0-indexed, mo = 현재월 숫자값)
      let payment_due: string;
      if (psConfig.type === "weekly") {
        // 다음달 1일부터 해당 요일까지 전진
        const d = new Date(y, mo, 1);
        while (d.getDay() !== psConfig.weeklyDow) d.setDate(d.getDate() + 1);
        payment_due = d.toLocaleDateString("sv-SE");
      } else {
        // 월 지급: 다음달 N일 (31 = 말일)
        if (psConfig.monthlyDay >= 31) {
          // 말일: 다음달+1의 0번째 날 = 다음달 마지막 날
          payment_due = new Date(y, mo + 1, 0).toLocaleDateString("sv-SE");
        } else {
          payment_due = new Date(y, mo, psConfig.monthlyDay).toLocaleDateString("sv-SE");
        }
      }

      return {
        month,
        label,
        status,
        pilotShare,           // 이 파일럿의 지분 % (UI 표시용)
        isOverride,
        payment_due,
        paid_at: sRow?.paid_at ? String(sRow.paid_at).slice(0, 10) : undefined,
        days,
      };
    });

    return NextResponse.json({ months, pilotShare, isOverride });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
