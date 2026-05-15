"use client";

import { useEffect, useState } from "react";

export type ScheduleStatus = "working" | "standby" | "off" | "etc";

export interface PilotMeta {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
}

export type ScheduleMap = Record<string, ScheduleStatus>;
export type AllSchedules = Record<string, ScheduleMap>;
// pilotId → date → 기타 사유 (파일럿 직접 입력)
export type AllScheduleNotes = Record<string, Record<string, string>>;

// API 기반으로 교체됨 - /api/pilots 사용
export const PILOTS_META: PilotMeta[] = [];

export const SCHEDULE_CFG: Record<ScheduleStatus, { label: string; color: string; bg: string }> = {
  working: { label: "출근",  color: "#2A7AE2", bg: "#EFF6FF" },
  standby: { label: "대기",  color: "#10B981", bg: "#ECFDF5" },
  off:     { label: "휴무",  color: "#6B7280", bg: "#F3F4F6" },
  etc:     { label: "기타",  color: "#8B5CF6", bg: "#F5F3FF" },
};

const EVENT_KEY = "gureum_schedule_update";

// ── 월별 캐시 (TTL: 60초) ──────────────────────────────────────────
const _monthCache: Record<string, AllSchedules> = {};
const _monthCacheTime: Record<string, number> = {};
const CACHE_TTL_MS = 60_000; // 60초 — 파일럿 포털 변경사항 반영

async function loadMonth(yearMonth: string, force = false): Promise<AllSchedules> {
  const now = Date.now();
  const cached = _monthCache[yearMonth];
  const age = now - (_monthCacheTime[yearMonth] ?? 0);
  if (!force && cached && age < CACHE_TTL_MS) return cached;
  try {
    const res = await fetch(`/api/schedules?year_month=${yearMonth}`);
    if (!res.ok) return cached ?? {};
    const data = await res.json();
    _monthCache[yearMonth] = data;
    _monthCacheTime[yearMonth] = now;
    return data;
  } catch {
    return cached ?? {};
  }
}

/** 특정 달(또는 전체)의 캐시를 무효화하고 즉시 재조회 */
export async function invalidateScheduleCache(yearMonth?: string) {
  if (yearMonth) {
    delete _monthCacheTime[yearMonth];
  } else {
    for (const k of Object.keys(_monthCacheTime)) delete _monthCacheTime[k];
  }
  window.dispatchEvent(new Event(EVENT_KEY));
}

// ── notes 캐시 (API 없음, 클라이언트 캐시만) ──────────────────────
const _notesCache: AllScheduleNotes = {};

// ── 공개 함수들 ───────────────────────────────────────────────────

export function getSchedules(): AllSchedules {
  // 동기적으로 현재 캐시에서 합쳐서 반환
  const merged: AllSchedules = {};
  for (const m of Object.values(_monthCache)) {
    for (const [pid, dates] of Object.entries(m)) {
      merged[pid] = { ...(merged[pid] ?? {}), ...dates };
    }
  }
  return merged;
}

export function getPilotSchedule(pilotId: string): ScheduleMap {
  return getSchedules()[pilotId] ?? {};
}

export async function updatePilotSchedule(pilotId: string, date: string, status: ScheduleStatus) {
  try {
    await fetch("/api/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pilotId, date, status }),
    });
  } catch {
    // 오류 시에도 캐시는 업데이트
  }
  // 캐시 업데이트
  const yearMonth = date.slice(0, 7);
  if (!_monthCache[yearMonth]) _monthCache[yearMonth] = {};
  if (!_monthCache[yearMonth][pilotId]) _monthCache[yearMonth][pilotId] = {};
  _monthCache[yearMonth][pilotId][date] = status;
  window.dispatchEvent(new Event(EVENT_KEY));
}

// ── 기타 사유 노트 ─────────────────────────────────────────────────

export async function updatePilotNote(pilotId: string, date: string, note: string) {
  // 현재 status 파악 (캐시에서)
  const yearMonth = date.slice(0, 7);
  const currentStatus: ScheduleStatus =
    _monthCache[yearMonth]?.[pilotId]?.[date] ?? "etc";

  try {
    await fetch("/api/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pilotId, date, status: currentStatus, memo: note }),
    });
  } catch {
    // 오류 시에도 로컬 캐시는 업데이트
  }

  // notes 캐시 업데이트
  if (!_notesCache[pilotId]) _notesCache[pilotId] = {};
  if (note.trim()) {
    _notesCache[pilotId][date] = note.trim();
  } else {
    delete _notesCache[pilotId][date];
  }
  window.dispatchEvent(new Event(EVENT_KEY));
}

export function getScheduleNotes(): AllScheduleNotes {
  return _notesCache;
}

export function useScheduleNotes() {
  const [notes, setNotes] = useState<AllScheduleNotes>({});

  useEffect(() => {
    const refresh = () => setNotes({ ..._notesCache });
    refresh();
    window.addEventListener(EVENT_KEY, refresh);
    return () => window.removeEventListener(EVENT_KEY, refresh);
  }, []);

  return notes;
}

export function useSchedules() {
  const [schedules, setSchedules] = useState<AllSchedules>({});

  useEffect(() => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const nextDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextMonth = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`;

    Promise.all([loadMonth(thisMonth), loadMonth(nextMonth)]).then(([m1, m2]) => {
      // deep merge: pilotId → { ...m1[pilotId], ...m2[pilotId] }
      const merged: AllSchedules = {};
      for (const pid of new Set([...Object.keys(m1), ...Object.keys(m2)])) {
        merged[pid] = { ...(m1[pid] ?? {}), ...(m2[pid] ?? {}) };
      }
      setSchedules(merged);
    });

    const refresh = () => {
      // TTL 만료된 달이 있으면 API 재조회, 아니면 캐시에서 재구성
      const now2 = new Date();
      const curMonth = `${now2.getFullYear()}-${String(now2.getMonth() + 1).padStart(2, "0")}`;
      const nxt = new Date(now2.getFullYear(), now2.getMonth() + 1, 1);
      const nxtMonth = `${nxt.getFullYear()}-${String(nxt.getMonth() + 1).padStart(2, "0")}`;
      Promise.all([loadMonth(curMonth), loadMonth(nxtMonth)]).then(([r1, r2]) => {
        const merged: AllSchedules = {};
        for (const pid of new Set([...Object.keys(r1), ...Object.keys(r2)])) {
          merged[pid] = { ...(r1[pid] ?? {}), ...(r2[pid] ?? {}) };
        }
        setSchedules({ ...merged });
      });
    };
    window.addEventListener(EVENT_KEY, refresh);
    return () => window.removeEventListener(EVENT_KEY, refresh);
  }, []);

  return schedules;
}
