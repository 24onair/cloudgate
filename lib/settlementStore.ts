"use client";

import { useEffect, useState } from "react";

// ── 정산 분배 비율 (파일럿 N% / 회사 (100-N)%) ──────────────────────────────
// 기본 정책: 일괄 적용. 예외적으로 특정 파일럿만 다른 비율을 가질 수 있음.

export interface SettlementConfig {
  defaultPilotShare: number; // 0~100, 파일럿 몫 (%) — 회사 몫 = 100 - this
}

export interface PilotShareOverride {
  pilotId: string;
  pilotShare: number;        // 0~100
  reason?: string;           // 사유 메모 (선택)
}

const EVENT_KEY = "gureum_settlement_update";

const DEFAULT_CFG: SettlementConfig = {
  defaultPilotShare: 60, // 파일럿 60% / 회사 40%
};

// ── 캐시 ──────────────────────────────────────────────────────────
let _cfgCache: SettlementConfig | null = null;
let _overridesCache: PilotShareOverride[] | null = null;

// ── API 헬퍼 ──────────────────────────────────────────────────────
async function saveCfgToApi(cfg: SettlementConfig): Promise<void> {
  await fetch("/api/site-settings/settlement_config", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value: cfg }),
  });
}

async function saveOverridesToApi(overrides: PilotShareOverride[]): Promise<void> {
  await fetch("/api/site-settings/settlement_overrides", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value: overrides }),
  });
}

// ── Config ─────────────────────────────────────────────────────────

export function getSettlementConfig(): SettlementConfig {
  return _cfgCache ?? DEFAULT_CFG;
}

export async function updateSettlementConfig(cfg: SettlementConfig): Promise<void> {
  const clean: SettlementConfig = { ...cfg, defaultPilotShare: clamp(cfg.defaultPilotShare) };
  _cfgCache = clean;
  try {
    await saveCfgToApi(clean);
  } catch {
    // 오류 시에도 캐시는 유지
  }
  window.dispatchEvent(new Event(EVENT_KEY));
}

// ── Per-Pilot Overrides ────────────────────────────────────────────

export function getOverrides(): PilotShareOverride[] {
  return _overridesCache ?? [];
}

export async function setPilotOverride(
  pilotIdOrOverride: string | PilotShareOverride,
  pilotShare?: number,
  reason?: string
): Promise<void> {
  // 객체 형태 호환: setPilotOverride({ pilotId, pilotShare, reason? })
  let resolved: PilotShareOverride;
  if (typeof pilotIdOrOverride === "object") {
    resolved = { ...pilotIdOrOverride, pilotShare: clamp(pilotIdOrOverride.pilotShare) };
  } else {
    resolved = { pilotId: pilotIdOrOverride, pilotShare: clamp(pilotShare ?? 0), reason };
  }

  const overrides = _overridesCache ? [..._overridesCache] : [];
  const idx = overrides.findIndex((o) => o.pilotId === resolved.pilotId);
  if (idx >= 0) {
    overrides[idx] = resolved;
  } else {
    overrides.push(resolved);
  }
  _overridesCache = overrides;
  try {
    await saveOverridesToApi(overrides);
  } catch {
    // 오류 시에도 캐시 유지
  }
  window.dispatchEvent(new Event(EVENT_KEY));
}

export async function removePilotOverride(pilotId: string): Promise<void> {
  const overrides = (_overridesCache ?? []).filter((o) => o.pilotId !== pilotId);
  _overridesCache = overrides;
  try {
    await saveOverridesToApi(overrides);
  } catch {
    // 오류 시에도 캐시 유지
  }
  window.dispatchEvent(new Event(EVENT_KEY));
}

// ── 적용 함수 ──────────────────────────────────────────────────────
export function getPilotShare(pilotId: string): { share: number; isOverride: boolean; reason?: string } {
  const overrides = _overridesCache ?? [];
  const o = overrides.find((x) => x.pilotId === pilotId);
  if (o) return { share: o.pilotShare, isOverride: true, reason: o.reason };
  return { share: getSettlementConfig().defaultPilotShare, isOverride: false };
}

export function calcSplit(amount: number, pilotId: string) {
  const { share, isOverride, reason } = getPilotShare(pilotId);
  const pilotAmount = Math.round((amount * share) / 100);
  return {
    pilotAmount,
    companyAmount: amount - pilotAmount,
    pilotShare: share,
    companyShare: 100 - share,
    isOverride,
    reason,
  };
}

// ── Hooks ──────────────────────────────────────────────────────────
export function useSettlementConfig() {
  const [cfg, setCfg] = useState<SettlementConfig>(DEFAULT_CFG);

  useEffect(() => {
    fetch("/api/site-settings/settlement_config")
      .then((r) => r.ok ? r.json() : null)
      .then((json) => {
        const loaded: SettlementConfig = json?.value ?? DEFAULT_CFG;
        _cfgCache = loaded;
        setCfg(loaded);
      })
      .catch(() => {});

    const refresh = () => setCfg(_cfgCache ?? DEFAULT_CFG);
    window.addEventListener(EVENT_KEY, refresh);
    return () => window.removeEventListener(EVENT_KEY, refresh);
  }, []);

  return cfg;
}

export function useOverrides() {
  const [overrides, setOverrides] = useState<PilotShareOverride[]>([]);

  useEffect(() => {
    fetch("/api/site-settings/settlement_overrides")
      .then((r) => r.ok ? r.json() : null)
      .then((json) => {
        const loaded: PilotShareOverride[] = json?.value ?? [];
        _overridesCache = loaded;
        setOverrides(loaded);
      })
      .catch(() => {});

    const refresh = () => setOverrides([...(_overridesCache ?? [])]);
    window.addEventListener(EVENT_KEY, refresh);
    return () => window.removeEventListener(EVENT_KEY, refresh);
  }, []);

  return overrides;
}

export function useSettlement() {
  const cfg = useSettlementConfig();
  const overridesArr = useOverrides();
  // 기존 코드 호환을 위해 Record 형태로도 제공
  const overrides = overridesArr.reduce<Record<string, PilotShareOverride>>((acc, o) => {
    acc[o.pilotId] = o;
    return acc;
  }, {});
  return { cfg, overrides };
}

// ── 지급 예정일 설정 ───────────────────────────────────────────────
export interface PaymentScheduleConfig {
  type: "monthly" | "weekly";
  monthlyDay: number;   // 1~31 (31 = 말일)
  weeklyDow: number;    // 0=일, 1=월, 2=화, 3=수, 4=목, 5=금, 6=토
}

export const DEFAULT_PAYMENT_SCHEDULE: PaymentScheduleConfig = {
  type: "monthly",
  monthlyDay: 10,
  weeklyDow: 5, // 금요일
};

let _paymentScheduleCache: PaymentScheduleConfig | null = null;

async function savePaymentScheduleToApi(cfg: PaymentScheduleConfig): Promise<void> {
  await fetch("/api/site-settings/payment_schedule", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value: cfg }),
  });
}

export function getPaymentSchedule(): PaymentScheduleConfig {
  return _paymentScheduleCache ?? DEFAULT_PAYMENT_SCHEDULE;
}

export async function updatePaymentSchedule(cfg: PaymentScheduleConfig): Promise<void> {
  _paymentScheduleCache = cfg;
  try { await savePaymentScheduleToApi(cfg); } catch { /* 오류 시 캐시 유지 */ }
  window.dispatchEvent(new Event(EVENT_KEY));
}

export function usePaymentSchedule() {
  const [cfg, setCfg] = useState<PaymentScheduleConfig>(DEFAULT_PAYMENT_SCHEDULE);

  useEffect(() => {
    fetch("/api/site-settings/payment_schedule")
      .then((r) => r.ok ? r.json() : null)
      .then((json) => {
        const loaded: PaymentScheduleConfig = json?.value ?? DEFAULT_PAYMENT_SCHEDULE;
        _paymentScheduleCache = loaded;
        setCfg(loaded);
      })
      .catch(() => {});

    const refresh = () => setCfg(_paymentScheduleCache ?? DEFAULT_PAYMENT_SCHEDULE);
    window.addEventListener(EVENT_KEY, refresh);
    return () => window.removeEventListener(EVENT_KEY, refresh);
  }, []);

  return cfg;
}

// ── Helpers ───────────────────────────────────────────────────────
export function clamp(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}
