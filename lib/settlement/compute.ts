/* eslint-disable @typescript-eslint/no-explicit-any */
// 정산 계산 공통 로직.
// /api/settlement?type=pilots 와 /api/pilot/settlement 두 엔드포인트가
// 같은 분배 공식을 공유하도록 추출. 회귀 방지가 목적이므로
// 기존 동작과 1원 단위까지 동일해야 한다.

export interface PilotShareOverride {
  pilotId: string;
  pilotShare: number;
  reason?: string;
}

export interface SettlementConfigValue {
  defaultPilotShare: number;
}

// ── 분배율 조회 ─────────────────────────────────────────────────
export function resolveShare(
  pilotId: string,
  defaultShare: number,
  overrides: PilotShareOverride[],
): { share: number; isOverride: boolean; reason?: string } {
  const o = overrides.find((x) => x.pilotId === pilotId);
  if (o) return { share: o.pilotShare, isOverride: true, reason: o.reason };
  return { share: defaultShare, isOverride: false };
}

// ── 단일 비행 파일럿 몫 ──────────────────────────────────────────
// 한 예약에 N명 배정 시 균등 분할 후 분배율 적용.
export function pilotAmountForBooking(
  totalPrice: number,
  pilotCount: number,
  share: number,
): number {
  const safeCount = pilotCount > 0 ? pilotCount : 1;
  return Math.round(((totalPrice / safeCount) * share) / 100);
}

// ── 사이트 설정 로드 ────────────────────────────────────────────
// 두 키(settlement_config, settlement_overrides)를 한 번에 읽는다.
export async function loadShareSettings(supabase: any): Promise<{
  defaultShare: number;
  overrides: PilotShareOverride[];
}> {
  const [cfgRow, overrideRow] = await Promise.all([
    supabase.from("site_settings").select("value").eq("key", "settlement_config").maybeSingle(),
    supabase.from("site_settings").select("value").eq("key", "settlement_overrides").maybeSingle(),
  ]);
  const defaultShare: number = cfgRow.data?.value?.defaultPilotShare ?? 60;
  const overrides: PilotShareOverride[] = overrideRow.data?.value ?? [];
  return { defaultShare, overrides };
}

// ── 파일럿별 기간 집계 (관리자 화면용) ──────────────────────────
// bookings(status='completed') + booking_pilots를 받아
// 파일럿별 비행수·매출(균등분할 전)·정산액(분배율 적용)을 산출.
export interface PilotAggregate {
  pilot_id: string;
  name: string;
  flights: number;
  revenue: number; // 균등분할 후 매출 = sum(total_price / N)
  share: number;
  isOverride: boolean;
  amount: number;  // 정산액 = round(revenue × share / 100)
}

export function aggregatePilots(args: {
  completedBookings: { id: string; total_price: number; pilot_id: string | null; pilots?: { id: string; name: string } | null }[];
  bookingPilots: { pilot_id: string; booking_id: string; pilots?: { id: string; name: string } | null }[];
  defaultShare: number;
  overrides: PilotShareOverride[];
}): PilotAggregate[] {
  const { completedBookings, bookingPilots, defaultShare, overrides } = args;

  const bookingRevMap: Record<string, number> = {};
  for (const b of completedBookings) bookingRevMap[b.id] = b.total_price ?? 0;

  const bookingPilotCount: Record<string, number> = {};
  for (const bp of bookingPilots) {
    bookingPilotCount[bp.booking_id] = (bookingPilotCount[bp.booking_id] ?? 0) + 1;
  }

  const map: Record<string, { pilot_id: string; name: string; flights: number; revenue: number }> = {};
  const seenBookingPilot = new Set<string>(); // booking_id|pilot_id 중복 방지

  for (const bp of bookingPilots) {
    const pid = bp.pilot_id;
    const key = `${bp.booking_id}|${pid}`;
    if (seenBookingPilot.has(key)) continue;
    seenBookingPilot.add(key);

    const pname = bp.pilots?.name ?? "미배정";
    const pCount = bookingPilotCount[bp.booking_id] ?? 1;
    const rev = (bookingRevMap[bp.booking_id] ?? 0) / pCount;
    if (!map[pid]) map[pid] = { pilot_id: pid, name: pname, flights: 0, revenue: 0 };
    map[pid].flights++;
    map[pid].revenue += rev;
  }

  // booking_pilots에 없지만 bookings.pilot_id만 있는 레거시 예약
  const bpBookingIds = new Set(bookingPilots.map((bp) => bp.booking_id));
  for (const b of completedBookings) {
    if (bpBookingIds.has(b.id)) continue;
    const pid = b.pilot_id;
    if (!pid) continue;
    const pname = b.pilots?.name ?? "미배정";
    if (!map[pid]) map[pid] = { pilot_id: pid, name: pname, flights: 0, revenue: 0 };
    map[pid].flights++;
    map[pid].revenue += b.total_price ?? 0;
  }

  return Object.values(map).map((p) => {
    const { share, isOverride } = resolveShare(p.pilot_id, defaultShare, overrides);
    const revenue = Math.round(p.revenue);
    const amount = Math.round((revenue * share) / 100);
    return { ...p, revenue, share, isOverride, amount };
  });
}
