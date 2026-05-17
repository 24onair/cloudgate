/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * 슬롯 이월 + 큐 포인터 기반 라운드로빈 자동 배정 알고리즘.
 *
 * 모델 B (큐 포인터):
 *  - tenant마다 "마지막에 비행을 받은 파일럿" 한 명을 pilot_rotation_state에 저장
 *  - 다음 배정은 그 파일럿의 다음 위치(기본 순번 또는 일자 오버라이드 기준)부터 시작
 *  - 휴가자(off/other)는 그날 가용 풀에서 통째로 빠지므로 자연스럽게 건너뜀
 *  - 복귀자는 본래 순번 자리에 그대로 끼어들어가서, 큐 포인터가 자기 차례 직전을 가리키고
 *    있다면 다음 비행에 자연 합류
 *
 * 슬롯 이월:
 *  - 요청 슬롯에서 부족한 인원만큼 다음 슬롯(+ slot_config.intervalMinutes)으로 자동 이월
 *  - 영업종료 슬롯까지 자리가 모자라면 exhausted=true 반환 → 호출측이
 *    bookings.assignment_status='pending_admin_review' 처리
 *
 * 정렬 키 변경 이력:
 *  - 구: (당일 비행수 → 순번 → 이름) ← 매일 1번부터 리셋되는 문제
 *  - 신: (큐 인덱스 단일 키) ← 하루를 넘어 이어지는 라운드로빈
 *
 * 일일 최대 비행수 / 휴식 간격 등은 BACKLOG.md의 P1 항목에서 별도 처리.
 */

type Supabase = any;

export interface AssignmentRow {
  pilot_id: string;
  slot_no: number;
  assigned_flight_time: string; // "HH:MM"
}

export interface AssignResult {
  assignments: AssignmentRow[];
  spillover: boolean;
  exhausted: boolean;
  requestedTime: string;
  exhaustedShortage: number; // 영업종료까지 채우지 못한 인원 수
}

interface PilotCandidate {
  id: string;
  name: string; // tie-breaker (큐 인덱스가 동률일 때만 발동)
  /**
   * effective 기본 순번 — 일자 오버라이드 > rotation_order > NO_ORDER.
   * 큐 시작점(last_assigned_pilot_id의 다음)을 결정하는 데만 사용.
   */
  effectiveOrder: number;
  /**
   * 큐 회전 인덱스 — 0부터 시작, 작을수록 다음 차례.
   * last_assigned_pilot_id의 다음 사람이 0.
   * 휴가자는 풀에 포함되지 않으므로 자연스럽게 인덱스에서 제외.
   */
  queueIdx: number;
}

const NO_ORDER = Number.MAX_SAFE_INTEGER;

interface SlotConfig {
  startTime: string;
  endTime: string;
  intervalMinutes: number;
}

const DEFAULT_SLOT_CFG: SlotConfig = {
  startTime: "09:00",
  endTime: "17:00",
  intervalMinutes: 30,
};

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function generateSlotTimesFromCfg(cfg: SlotConfig): string[] {
  const start = timeToMinutes(cfg.startTime);
  const end = timeToMinutes(cfg.endTime);
  const out: string[] = [];
  for (let t = start; t <= end; t += cfg.intervalMinutes) out.push(minutesToTime(t));
  return out;
}

async function loadSlotConfig(supabase: Supabase, tenantId: string): Promise<SlotConfig> {
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("tenant_id", tenantId)
    .eq("key", "slot_config")
    .maybeSingle();
  return { ...DEFAULT_SLOT_CFG, ...(data?.value ?? {}) };
}

async function loadAvailablePilots(
  supabase: Supabase,
  tenantId: string,
  date: string,
): Promise<PilotCandidate[]> {
  const [
    { data: pilots },
    { data: schedules },
    { data: overrides },
    { data: state },
  ] = await Promise.all([
    supabase
      .from("pilots")
      .select("id, name, rotation_order")
      .eq("tenant_id", tenantId)
      .eq("status", "active"),
    supabase
      .from("pilot_schedules")
      .select("pilot_id, type")
      .eq("tenant_id", tenantId)
      .eq("date", date),
    // 그날 일자 오버라이드 — 있으면 기본 rotation_order보다 우선
    supabase
      .from("pilot_rotation_overrides")
      .select("pilot_id, order_idx")
      .eq("tenant_id", tenantId)
      .eq("date", date),
    // 큐 포인터 — 마지막 배정자
    supabase
      .from("pilot_rotation_state")
      .select("last_assigned_pilot_id")
      .eq("tenant_id", tenantId)
      .maybeSingle(),
  ]);

  const unavailable = new Set<string>();
  for (const s of schedules ?? []) {
    if (s.type === "off" || s.type === "other") unavailable.add(s.pilot_id);
  }

  const overrideMap: Record<string, number> = {};
  for (const o of overrides ?? []) {
    overrideMap[o.pilot_id] = o.order_idx;
  }

  // 1) 가용 풀 구성 + effective 기본 순번 부여
  const available = (pilots ?? [])
    .filter((p: any) => !unavailable.has(p.id))
    .map((p: any) => ({
      id: p.id,
      name: p.name ?? "",
      effectiveOrder: overrideMap[p.id] ?? (p.rotation_order ?? NO_ORDER),
    }));

  // 2) effective 순번 오름차순으로 큐 배열을 만들기 (동률은 이름)
  const ordered = [...available].sort((a, b) => {
    if (a.effectiveOrder !== b.effectiveOrder) return a.effectiveOrder - b.effectiveOrder;
    return a.name.localeCompare(b.name);
  });

  // 3) 큐 시작점 찾기 — last_assigned_pilot_id 직후
  const lastId: string | null = state?.last_assigned_pilot_id ?? null;
  const N = ordered.length;
  let startIdx = 0;
  if (lastId) {
    const idx = ordered.findIndex((p) => p.id === lastId);
    // 마지막 배정자가 오늘 풀에 없을 수도 있음(휴가 등) — 이 경우 0부터 시작 (가장 빠른 사람부터)
    startIdx = idx >= 0 ? (idx + 1) % N : 0;
  }

  // 4) queueIdx 부여: startIdx가 0번째, 그 다음이 1번째...
  return ordered.map((p, i) => ({
    id: p.id,
    name: p.name,
    effectiveOrder: p.effectiveOrder,
    queueIdx: N === 0 ? 0 : (i - startIdx + N) % N,
  }));
}

async function loadSlotAssignments(
  supabase: Supabase,
  tenantId: string,
  date: string,
): Promise<Record<string, Set<string>>> {
  // slotTime → Set<pilot_id> (이미 그 슬롯에 배정된 파일럿)
  const { data } = await supabase
    .from("booking_pilots")
    .select("pilot_id, assigned_flight_time, bookings!inner(flight_date)")
    .eq("tenant_id", tenantId)
    .eq("bookings.flight_date", date);

  const map: Record<string, Set<string>> = {};
  for (const row of data ?? []) {
    const t: string = row.assigned_flight_time;
    if (!t) continue;
    if (!map[t]) map[t] = new Set();
    map[t].add(row.pilot_id);
  }
  return map;
}

/**
 * 한 예약(headcount명)을 요청 슬롯에서 시작해 인접 슬롯으로 이월 배정.
 * 영업종료까지 모자라면 exhausted=true, assignments는 비움(호출측이 booking 상태만 갱신).
 */
export async function assignPilotsForBooking(params: {
  supabase: Supabase;
  tenantId: string;
  date: string;          // YYYY-MM-DD
  requestedTime: string; // "HH:MM"
  headcount: number;
}): Promise<AssignResult> {
  const { supabase, tenantId, date, requestedTime, headcount } = params;

  const cfg = await loadSlotConfig(supabase, tenantId);
  const [pilots, slotMap] = await Promise.all([
    loadAvailablePilots(supabase, tenantId, date),
    loadSlotAssignments(supabase, tenantId, date),
  ]);

  const slotList = generateSlotTimesFromCfg(cfg);
  const startIdx = slotList.indexOf(requestedTime);
  // 요청 슬롯이 슬롯 그리드에 없으면 가장 가까운 다음 슬롯에서 시작
  const safeStartIdx = startIdx >= 0
    ? startIdx
    : Math.max(
        0,
        slotList.findIndex((t) => timeToMinutes(t) >= timeToMinutes(requestedTime)),
      );

  const assignments: AssignmentRow[] = [];
  let needed = headcount;
  let slotNo = 1;
  let spillover = false;

  for (let i = safeStartIdx; i < slotList.length && needed > 0; i++) {
    const cursor = slotList[i];
    const assignedAtCursor = slotMap[cursor] ?? new Set<string>();

    // 가용 = 그날 전체 가용 - 이미 그 슬롯에 점유된 파일럿.
    // 같은 파일럿은 같은 시각에만 못 가지, 시각이 다르면 다른 슬롯에 또 탈 수 있음.
    const free = pilots.filter((p) => !assignedAtCursor.has(p.id));
    if (free.length === 0) continue;

    // 큐 인덱스 오름차순 (작을수록 다음 차례). 동률은 이름.
    // queueIdx는 loadAvailablePilots에서 last_assigned_pilot_id 기준으로 부여됨.
    free.sort((a, b) => {
      if (a.queueIdx !== b.queueIdx) return a.queueIdx - b.queueIdx;
      return a.name.localeCompare(b.name);
    });

    const take = Math.min(needed, free.length);
    for (let k = 0; k < take; k++) {
      const p = free[k];
      assignments.push({
        pilot_id: p.id,
        slot_no: slotNo++,
        assigned_flight_time: cursor,
      });
      // 같은 슬롯 재배정 차단
      assignedAtCursor.add(p.id);
      slotMap[cursor] = assignedAtCursor;
      // 큐 회전 — 이 사람을 가장 뒤로. N 더해 모든 인덱스를 +1, 본인은 N-1.
      // 결과적으로 다음 슬롯에서 free.sort 시 이 사람이 가장 마지막에 옴.
      const N = pilots.length;
      if (N > 0) {
        for (const q of pilots) {
          if (q.id === p.id) q.queueIdx = N - 1;
          else q.queueIdx = (q.queueIdx + N - 1) % N;
        }
      }
    }
    needed -= take;
    if (i !== safeStartIdx && take > 0) spillover = true;
  }

  if (needed > 0) {
    return {
      assignments: [],
      spillover: false,
      exhausted: true,
      requestedTime,
      exhaustedShortage: needed,
    };
  }

  // ── 큐 포인터 갱신 — 이번 배정의 마지막 파일럿이 다음번의 "last_assigned" ──
  const lastPilotId = assignments[assignments.length - 1]?.pilot_id ?? null;
  if (lastPilotId) {
    await supabase
      .from("pilot_rotation_state")
      .upsert(
        {
          tenant_id: tenantId,
          last_assigned_pilot_id: lastPilotId,
          last_assigned_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "tenant_id" },
      );
  }

  return {
    assignments,
    spillover,
    exhausted: false,
    requestedTime,
    exhaustedShortage: 0,
  };
}

/**
 * 특정일자 휴무/기타 등록 가능 여부 검사.
 * 해당 파일럿이 그날 booking_pilots 배정을 보유하면 차단.
 */
export async function findScheduleConflicts(params: {
  supabase: Supabase;
  tenantId: string;
  pilotId: string;
  date: string;
}): Promise<
  Array<{
    booking_id: string;
    booking_no: string | null;
    customer_name: string | null;
    flight_time: string | null;
    assigned_flight_time: string | null;
  }>
> {
  const { supabase, tenantId, pilotId, date } = params;
  const { data } = await supabase
    .from("booking_pilots")
    .select(
      "booking_id, assigned_flight_time, bookings!inner(id, booking_no, customer_name, flight_time, flight_date)",
    )
    .eq("tenant_id", tenantId)
    .eq("pilot_id", pilotId)
    .eq("bookings.flight_date", date);

  return (data ?? []).map((row: any) => ({
    booking_id: row.booking_id,
    booking_no: row.bookings?.booking_no ?? null,
    customer_name: row.bookings?.customer_name ?? null,
    flight_time: row.bookings?.flight_time ?? null,
    assigned_flight_time: row.assigned_flight_time ?? null,
  }));
}
