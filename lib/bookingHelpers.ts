// 예약 분할(자동 인접 슬롯 배정) 헬퍼

import { generateSlotTimes, type SlotConfig } from "./slotStore";

export interface RawBooking {
  booking_id: string;
  start_slot: string;       // "11:30"
  customer_name: string;
  headcount: number;
  product_name: string;
  start_pilot_id?: string;  // 첫 슬롯 담당 파일럿 (지정 시)
}

export interface PilotRef {
  id: string;
  name: string;
}

export interface ExpandedSlot {
  booking_id: string;
  time_slot: string;
  customer_name: string;
  headcount: number;        // 이 슬롯에서의 분할 인원
  product_name: string;
  pilot_id: string;
  pilot_name: string;
  part: number;             // 1부터
  totalParts: number;       // 총 분할 수 (1이면 분할 없음)
}

/**
 * 예약 1건을 정원(슬롯당 가용 파일럿 수)에 따라 인접 슬롯으로 자동 분할.
 *  - 8명 + 정원 4명 + 30분 간격 → 11:30(4명) + 12:00(4명) 두 슬롯에 분할
 *  - 파일럿은 round-robin으로 슬롯마다 다른 파일럿을 배정
 */
export function expandBooking(
  booking: RawBooking,
  slotCapacity: number,
  pilots: PilotRef[],
  cfg: SlotConfig,
): ExpandedSlot[] {
  const allSlots = generateSlotTimes(cfg);
  const startIdx = allSlots.indexOf(booking.start_slot);
  const totalParts = Math.max(1, Math.ceil(booking.headcount / slotCapacity));

  // 시작 파일럿 인덱스 (round-robin 시작점)
  const startPilotIdx = booking.start_pilot_id
    ? Math.max(0, pilots.findIndex((p) => p.id === booking.start_pilot_id))
    : 0;

  const out: ExpandedSlot[] = [];
  let remaining = booking.headcount;

  for (let i = 0; i < totalParts; i++) {
    const count = Math.min(remaining, slotCapacity);
    const slotTime =
      startIdx >= 0 && allSlots[startIdx + i]
        ? allSlots[startIdx + i]
        : booking.start_slot; // 폴백
    const pilot = pilots.length > 0
      ? pilots[(startPilotIdx + i) % pilots.length]
      : { id: "?", name: "미배정" };

    out.push({
      booking_id: booking.booking_id,
      time_slot: slotTime,
      customer_name: booking.customer_name,
      headcount: count,
      product_name: booking.product_name,
      pilot_id: pilot.id,
      pilot_name: pilot.name,
      part: i + 1,
      totalParts,
    });
    remaining -= count;
  }

  return out;
}

export function expandBookings(
  bookings: RawBooking[],
  slotCapacity: number,
  pilots: PilotRef[],
  cfg: SlotConfig,
): ExpandedSlot[] {
  return bookings.flatMap((b) => expandBooking(b, slotCapacity, pilots, cfg));
}
