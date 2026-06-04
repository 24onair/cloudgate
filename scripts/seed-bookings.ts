/**
 * 더미 예약 시드 — 정산 흐름 테스트용.
 *
 * - 대상: 2026년 5월(전체 '완료') + 6월(오늘 이전 '완료', 이후 '예정')
 * - 볼륨: 주말 집중(화요일 휴무, 평일 1~3건, 토·일 5~7건)
 * - 예약마다 headcount만큼 파일럿을 라운드로빈으로 배정(booking_pilots)
 * - 모든 더미는 memo에 [SEED-DUMMY] 태그 + booking_no 'BD-' 접두어 → 식별/삭제 용이
 *
 * 재실행 안전: 시작 시 기존 [SEED-DUMMY] 예약을 먼저 삭제(booking_pilots는 cascade).
 *
 * 실행: npx tsx scripts/seed-bookings.ts
 * 삭제: npx tsx scripts/clean-dummy.ts
 */
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf-8").split("\n").forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  });
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const TAG = "[SEED-DUMMY]";
const TODAY = "2026-06-04"; // 완료/예정 경계
const MONTHS = [{ y: 2026, m: 5 }, { y: 2026, m: 6 }];

// 요일별 기본 건수 (0=일 … 6=토). 화(2)=휴무.
const BASE_BY_DOW: Record<number, number> = { 0: 5, 1: 2, 2: 0, 3: 2, 4: 2, 5: 3, 6: 5 };
const SLOTS = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"];
const NAMES = ["김도윤", "이서준", "박하준", "최지우", "정유나", "강민서", "조은우", "윤서연", "장하린", "임지호", "한예준", "오시윤", "서주원", "신가은", "권태경"];

// 결정적 난수 (재현 가능)
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260604);
const pick = <T,>(arr: T[]) => arr[Math.floor(rng() * arr.length)];
const weighted = <T,>(items: [T, number][]): T => {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [v, w] of items) { if ((r -= w) <= 0) return v; }
  return items[0][0];
};
const pad = (n: number) => String(n).padStart(2, "0");
const fmt = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const daysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate();
const dow = (y: number, m: number, d: number) => new Date(y, m - 1, d).getDay();

async function main() {
  const { data: tenant } = await supabase.from("tenants").select("id").eq("slug", "gureum").single();
  if (!tenant) { console.error("테넌트 없음"); process.exit(1); }
  const tenantId = tenant.id;

  const { data: pilots } = await supabase
    .from("pilots").select("id, name").eq("tenant_id", tenantId).eq("status", "active")
    .order("rotation_order", { ascending: true });
  const { data: products } = await supabase
    .from("products").select("id, name, price").eq("tenant_id", tenantId).eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (!pilots?.length || !products?.length) { console.error("파일럿/상품 없음"); process.exit(1); }

  const productWeights: [typeof products[number], number][] = [
    [products[0], 40], [products[1], 30], [products[2] ?? products[0], 20], [products[3] ?? products[0], 10],
  ];

  // ── 0) 기존 더미 삭제 ──
  const { data: oldDummies } = await supabase
    .from("bookings").select("id").eq("tenant_id", tenantId).ilike("memo", `%${TAG}%`);
  if (oldDummies?.length) {
    const ids = oldDummies.map((b) => b.id);
    await supabase.from("flight_records").delete().in("booking_id", ids);
    await supabase.from("booking_pilots").delete().in("booking_id", ids);
    await supabase.from("bookings").delete().in("id", ids);
    console.log(`기존 더미 ${ids.length}건 삭제`);
  }

  // ── 1) 예약 생성 ──
  type NewBooking = Record<string, unknown> & { _headcount: number; _date: string; _time: string };
  const bookingsToInsert: NewBooking[] = [];
  let pilotCursor = 0;

  for (const { y, m } of MONTHS) {
    const dim = daysInMonth(y, m);
    for (let d = 1; d <= dim; d++) {
      const wd = dow(y, m, d);
      let count = BASE_BY_DOW[wd];
      if (wd === 0 || wd === 6) count = 5 + Math.floor(rng() * 3); // 주말 5~7
      else if (count > 0) count = Math.max(1, Math.min(3, count + (rng() < 0.3 ? (rng() < 0.5 ? -1 : 1) : 0)));
      if (count <= 0) continue;

      const date = fmt(y, m, d);
      // 오늘 이전 = 완료(정산/비행기록 대상), 오늘+미래 = 예정(파일럿이 비행시작/착륙 눌러볼 수 있게)
      const status = date < TODAY ? "completed" : "confirmed";
      const usedSlots: string[] = [];

      for (let i = 0; i < count; i++) {
        const product = weighted(productWeights);
        const headcount = weighted([[1, 40], [2, 35], [3, 20], [4, 5]]);
        const total = product.price * headcount;
        const deposit = headcount * 10000;
        let time = SLOTS[i % SLOTS.length];
        while (usedSlots.includes(time) && usedSlots.length < SLOTS.length) time = SLOTS[(SLOTS.indexOf(time) + 1) % SLOTS.length];
        usedSlots.push(time);

        bookingsToInsert.push({
          tenant_id: tenantId,
          booking_no: `BD-${y}${pad(m)}${pad(d)}-${pad(i + 1)}`,
          customer_name: pick(NAMES),
          customer_phone: `010-${pad(Math.floor(rng() * 90) + 10)}${pad(Math.floor(rng() * 90) + 10)}-${pad(Math.floor(rng() * 90) + 10)}${pad(Math.floor(rng() * 90) + 10)}`,
          product_id: product.id,
          product_name: product.name,
          product_price: product.price,
          headcount,
          flight_date: date,
          flight_time: time,
          options: [],
          total_price: total,
          deposit_amount: deposit,
          balance_amount: total - deposit,
          status,
          channel: rng() < 0.5 ? "online" : "phone",
          // 배정의 진실원은 booking_pilots. bookings.pilot_id(레거시)를 따로 채우면
          // 정산서(detail) 엔드포인트가 레거시 경로로 중복 집계하므로 null 로 둔다.
          pilot_id: null,
          memo: `${TAG} ${["일", "월", "화", "수", "목", "금", "토"][wd]}요일`,
          assignment_status: "auto",
          _headcount: headcount,
          _date: date,
          _time: time,
        });
      }
    }
  }

  // DB insert (배치)
  const rows = bookingsToInsert.map(({ _headcount, _date, _time, ...rest }) => rest);
  const { data: inserted, error } = await supabase.from("bookings").insert(rows).select("id");
  if (error) { console.error("예약 insert 실패:", error.message); process.exit(1); }
  console.log(`예약 ${inserted!.length}건 생성`);

  // ── 2) 파일럿 배정 (booking_pilots) ──
  const bpRows: Record<string, unknown>[] = [];
  for (let idx = 0; idx < inserted!.length; idx++) {
    const bk = bookingsToInsert[idx];
    const bookingId = inserted![idx].id;
    for (let s = 0; s < bk._headcount; s++) {
      const pilot = pilots[pilotCursor % pilots.length];
      pilotCursor++;
      bpRows.push({
        tenant_id: tenantId,
        booking_id: bookingId,
        pilot_id: pilot.id,
        slot_no: s + 1,
        assigned_flight_time: bk._time,
      });
    }
  }
  // 동일 예약 내 파일럿 중복 방지: headcount<=pilots.length 이므로 라운드로빈으로 distinct 보장됨
  const { error: bpErr } = await supabase.from("booking_pilots").insert(bpRows);
  if (bpErr) { console.error("배정 insert 실패:", bpErr.message); process.exit(1); }
  console.log(`파일럿 배정 ${bpRows.length}건 생성`);

  // ── 2.5) 비행기록 (flight_records) — 완료 예약만, 파일럿별 1건 ──
  // 파일럿 포털의 '비행기록'·'정산' 탭은 flight_records 를 읽으므로 함께 생성.
  // booking_pilots 와 동일 구조(파일럿별 1행), landing_at 은 timestamptz 풀 타임스탬프.
  const frRows: Record<string, unknown>[] = [];
  let bpIdx = 0;
  for (let idx = 0; idx < inserted!.length; idx++) {
    const bk = bookingsToInsert[idx];
    const bookingId = inserted![idx].id;
    for (let s = 0; s < bk._headcount; s++) {
      const pid = bpRows[bpIdx].pilot_id as string;
      bpIdx++;
      if (bk.status !== "completed") continue; // 완료건만 비행기록 생성
      frRows.push({
        tenant_id: tenantId,
        booking_id: bookingId,
        pilot_id: pid,
        flight_date: bk._date,
        landing_at: `${bk._date}T${bk._time}:00`,
        memo: TAG,
      });
    }
  }
  if (frRows.length) {
    const { error: frErr } = await supabase.from("flight_records").insert(frRows);
    if (frErr) { console.error("비행기록 insert 실패:", frErr.message); process.exit(1); }
  }
  console.log(`비행기록 ${frRows.length}건 생성 (완료 예약 대상)`);

  // ── 3) 정산 예상치 출력 ──
  console.log("\n=== 예상 정산 (완료건만, 분배율 50%) ===");
  const completed = bookingsToInsert.filter((b) => b.status === "completed");
  const perPilot: Record<string, { name: string; flights: number; revenue: number }> = {};
  let bpi = 0;
  // 완료/예정 순서대로 배정했으므로 재계산: 위 bpRows를 그대로 사용
  for (let idx = 0; idx < inserted!.length; idx++) {
    const bk = bookingsToInsert[idx];
    const perFlightRev = bk.product_price as number; // total/headcount = product_price
    for (let s = 0; s < bk._headcount; s++) {
      const pid = bpRows[bpi].pilot_id as string;
      bpi++;
      if (bk.status !== "completed") continue;
      const pname = pilots.find((p) => p.id === pid)!.name;
      if (!perPilot[pid]) perPilot[pid] = { name: pname, flights: 0, revenue: 0 };
      perPilot[pid].flights++;
      perPilot[pid].revenue += perFlightRev;
    }
  }
  console.table(
    Object.values(perPilot).map((p) => ({
      파일럿: p.name, 완료비행: p.flights,
      매출: p.revenue.toLocaleString(), "정산액(50%)": Math.round(p.revenue * 0.5).toLocaleString(),
    })),
  );
  console.log(`완료 예약 ${completed.length}건 / 예정 ${bookingsToInsert.length - completed.length}건`);
  console.log("→ 관리자 정산 화면에서 2026-05, 2026-06 으로 확인하세요.");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
