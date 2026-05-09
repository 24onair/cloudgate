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

const CFG_KEY      = "gureum_settlement_config";
const OVERRIDE_KEY = "gureum_pilot_share_overrides";
const EVENT_KEY    = "gureum_settlement_update";

const DEFAULT_CFG: SettlementConfig = {
  defaultPilotShare: 60, // 파일럿 60% / 회사 40%
};

// TODO: API — 정산 설정 localStorage → API 교체
// loadCfg()              → GET  /api/settlement/config
// updateSettlementConfig → PATCH /api/settlement/config { defaultPilotShare }
// loadOverrides()        → GET  /api/settlement/overrides
// setPilotOverride()     → PUT  /api/settlement/overrides/:pilotId
// removePilotOverride()  → DELETE /api/settlement/overrides/:pilotId

// ── Config ────────────────────────────────────────────
function loadCfg(): SettlementConfig {
  if (typeof window === "undefined") return DEFAULT_CFG;
  try {
    const raw = localStorage.getItem(CFG_KEY);
    return raw ? { ...DEFAULT_CFG, ...JSON.parse(raw) } : DEFAULT_CFG;
  } catch { return DEFAULT_CFG; }
}

export function getSettlementConfig(): SettlementConfig {
  return loadCfg();
}

export function updateSettlementConfig(cfg: SettlementConfig) {
  const clean = { ...cfg, defaultPilotShare: clamp(cfg.defaultPilotShare) };
  localStorage.setItem(CFG_KEY, JSON.stringify(clean));
  window.dispatchEvent(new Event(EVENT_KEY));
}

// ── Per-Pilot Overrides ──────────────────────────────
function loadOverrides(): Record<string, PilotShareOverride> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(OVERRIDE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function getOverrides(): Record<string, PilotShareOverride> {
  return loadOverrides();
}

export function setPilotOverride(o: PilotShareOverride) {
  const data = loadOverrides();
  data[o.pilotId] = { ...o, pilotShare: clamp(o.pilotShare) };
  localStorage.setItem(OVERRIDE_KEY, JSON.stringify(data));
  window.dispatchEvent(new Event(EVENT_KEY));
}

export function removePilotOverride(pilotId: string) {
  const data = loadOverrides();
  delete data[pilotId];
  localStorage.setItem(OVERRIDE_KEY, JSON.stringify(data));
  window.dispatchEvent(new Event(EVENT_KEY));
}

// ── 적용 함수 ─────────────────────────────────────────
export function getPilotShare(pilotId: string): { share: number; isOverride: boolean; reason?: string } {
  const overrides = loadOverrides();
  const o = overrides[pilotId];
  if (o) return { share: o.pilotShare, isOverride: true, reason: o.reason };
  return { share: loadCfg().defaultPilotShare, isOverride: false };
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

// ── Hook ──────────────────────────────────────────────
export function useSettlement() {
  const [cfg, setCfg] = useState<SettlementConfig>(DEFAULT_CFG);
  const [overrides, setOverrides] = useState<Record<string, PilotShareOverride>>({});

  useEffect(() => {
    const refresh = () => {
      setCfg(loadCfg());
      setOverrides(loadOverrides());
    };
    refresh();
    window.addEventListener(EVENT_KEY, refresh);
    return () => window.removeEventListener(EVENT_KEY, refresh);
  }, []);

  return { cfg, overrides };
}

// ── Helpers ──────────────────────────────────────────
function clamp(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}
