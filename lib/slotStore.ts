"use client";

import { useEffect, useState } from "react";
import type { AllSchedules } from "./scheduleStore";

export interface SlotConfig {
  startTime: string;       // "09:00"
  endTime: string;         // "17:00"
  intervalMinutes: number; // 15 | 30 | 60
}

// date(YYYY-MM-DD) → [차단된 시간들("HH:mm")]
export type BlockedSlots = Record<string, string[]>;

// TODO: API — 슬롯 설정/차단 localStorage → API 교체
// loadCfg()           → GET  /api/slots/config
// updateSlotConfig()  → PATCH /api/slots/config { startTime, endTime, intervalMinutes }
// loadBlocks()        → GET  /api/slots/blocked
// toggleBlockedSlot() → PATCH /api/slots/blocked/:date { time, blocked: boolean }

const CFG_KEY      = "gureum_slot_config";
const BLOCK_KEY    = "gureum_blocked_slots";
const EVENT_KEY    = "gureum_slots_update";

const DEFAULT_CFG: SlotConfig = {
  startTime: "09:00",
  endTime:   "17:00",
  intervalMinutes: 30,
};

// ── Config ─────────────────────────────────────────────
function loadCfg(): SlotConfig {
  if (typeof window === "undefined") return DEFAULT_CFG;
  try {
    const raw = localStorage.getItem(CFG_KEY);
    return raw ? { ...DEFAULT_CFG, ...JSON.parse(raw) } : DEFAULT_CFG;
  } catch { return DEFAULT_CFG; }
}

export function getSlotConfig(): SlotConfig {
  return loadCfg();
}

export function updateSlotConfig(cfg: SlotConfig) {
  localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
  window.dispatchEvent(new Event(EVENT_KEY));
}

export function useSlotConfig() {
  const [cfg, setCfg] = useState<SlotConfig>(DEFAULT_CFG);
  useEffect(() => {
    const refresh = () => setCfg(loadCfg());
    refresh();
    window.addEventListener(EVENT_KEY, refresh);
    return () => window.removeEventListener(EVENT_KEY, refresh);
  }, []);
  return cfg;
}

// ── Blocked Slots ──────────────────────────────────────
function loadBlocks(): BlockedSlots {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(BLOCK_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function getBlockedSlots(): BlockedSlots {
  return loadBlocks();
}

export function toggleBlockedSlot(date: string, time: string) {
  const data = loadBlocks();
  const list = data[date] ?? [];
  if (list.includes(time)) {
    data[date] = list.filter((t) => t !== time);
    if (data[date].length === 0) delete data[date];
  } else {
    data[date] = [...list, time];
  }
  localStorage.setItem(BLOCK_KEY, JSON.stringify(data));
  window.dispatchEvent(new Event(EVENT_KEY));
}

export function useBlockedSlots() {
  const [blocks, setBlocks] = useState<BlockedSlots>({});
  useEffect(() => {
    const refresh = () => setBlocks(loadBlocks());
    refresh();
    window.addEventListener(EVENT_KEY, refresh);
    return () => window.removeEventListener(EVENT_KEY, refresh);
  }, []);
  return blocks;
}

// ── 슬롯 시간 계산 ──────────────────────────────────────
export function generateSlotTimes(cfg: SlotConfig): string[] {
  const [sh, sm] = cfg.startTime.split(":").map(Number);
  const [eh, em] = cfg.endTime.split(":").map(Number);
  const start = sh * 60 + sm;
  const end   = eh * 60 + em;
  const out: string[] = [];
  for (let t = start; t <= end; t += cfg.intervalMinutes) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
  return out;
}

// ── 가용 파일럿 카운트 (working + standby) ─────────────
export function countAvailablePilots(date: string, schedules: AllSchedules): number {
  let count = 0;
  for (const pilotId of Object.keys(schedules)) {
    const s = schedules[pilotId]?.[date];
    if (s === "working" || s === "standby") count++;
  }
  return count;
}
