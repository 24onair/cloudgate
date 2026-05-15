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

const CFG_EVENT_KEY    = "gureum_slots_config_update";
const BLOCKS_EVENT_KEY = "gureum_slots_blocks_update";

const DEFAULT_CFG: SlotConfig = {
  startTime: "09:00",
  endTime:   "17:00",
  intervalMinutes: 30,
};

// ── Config ─────────────────────────────────────────────
let _cfgCache: SlotConfig | null = null;

async function loadCfg(): Promise<SlotConfig> {
  try {
    const res = await fetch("/api/site-settings/slot_config");
    if (!res.ok) return DEFAULT_CFG;
    const json = await res.json();
    if (!json || !json.value) return DEFAULT_CFG;
    _cfgCache = { ...DEFAULT_CFG, ...json.value };
    return _cfgCache!;
  } catch {
    return DEFAULT_CFG;
  }
}

export function getSlotConfig(): SlotConfig {
  return _cfgCache ?? DEFAULT_CFG;
}

export async function updateSlotConfig(cfg: SlotConfig): Promise<void> {
  _cfgCache = cfg;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CFG_EVENT_KEY));
  try {
    await fetch("/api/site-settings/slot_config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: cfg }),
    });
  } catch { /* ignore */ }
}

export function useSlotConfig() {
  const [cfg, setCfg] = useState<SlotConfig>(_cfgCache ?? DEFAULT_CFG);
  useEffect(() => {
    let mounted = true;
    if (!_cfgCache) {
      loadCfg().then((d) => { if (mounted) setCfg(d); });
    }
    const refresh = () => { if (_cfgCache) setCfg({ ..._cfgCache! }); };
    window.addEventListener(CFG_EVENT_KEY, refresh);
    return () => {
      mounted = false;
      window.removeEventListener(CFG_EVENT_KEY, refresh);
    };
  }, []);
  return cfg;
}

// ── Blocked Slots ──────────────────────────────────────
let _blocksCache: BlockedSlots | null = null;

async function loadBlocks(): Promise<BlockedSlots> {
  try {
    const res = await fetch("/api/blocked-slots");
    if (!res.ok) return {};
    const json = await res.json();
    _blocksCache = json ?? {};
    return _blocksCache!;
  } catch {
    return {};
  }
}

export function getBlockedSlots(): BlockedSlots {
  return _blocksCache ?? {};
}

export async function toggleBlockedSlot(date: string, time: string): Promise<void> {
  const current = _blocksCache ?? {};
  const list = current[date] ?? [];
  const isBlocked = list.includes(time);

  if (isBlocked) {
    // 차단 해제
    const newList = list.filter((t) => t !== time);
    if (newList.length === 0) {
      const updated = { ...current };
      delete updated[date];
      _blocksCache = updated;
    } else {
      _blocksCache = { ...current, [date]: newList };
    }
    if (typeof window !== "undefined") window.dispatchEvent(new Event(BLOCKS_EVENT_KEY));
    try {
      await fetch("/api/blocked-slots", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, time }),
      });
    } catch { /* ignore */ }
  } else {
    // 차단 추가
    _blocksCache = { ...current, [date]: [...list, time] };
    if (typeof window !== "undefined") window.dispatchEvent(new Event(BLOCKS_EVENT_KEY));
    try {
      await fetch("/api/blocked-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, time }),
      });
    } catch { /* ignore */ }
  }
}

export function useBlockedSlots() {
  const [blocks, setBlocks] = useState<BlockedSlots>(_blocksCache ?? {});
  useEffect(() => {
    let mounted = true;
    if (!_blocksCache) {
      loadBlocks().then((d) => { if (mounted) setBlocks(d); });
    }
    const refresh = () => { if (_blocksCache) setBlocks({ ..._blocksCache! }); };
    window.addEventListener(BLOCKS_EVENT_KEY, refresh);
    return () => {
      mounted = false;
      window.removeEventListener(BLOCKS_EVENT_KEY, refresh);
    };
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

// ── 가용 파일럿 카운트 ─────────────────────────────────
// 스케줄 기록이 없는 파일럿 = 기본 출근(가용)으로 간주
// 명시적으로 "off" 또는 "etc"로 지정된 파일럿만 제외
export function countAvailablePilots(date: string, schedules: AllSchedules): number {
  let count = 0;
  for (const pilotId of Object.keys(schedules)) {
    const s = schedules[pilotId]?.[date];
    // 명시적 휴무/기타가 아니면 가용 (undefined, "working", "standby" 모두 포함)
    if (s !== "off" && s !== "etc") count++;
  }
  return count;
}
