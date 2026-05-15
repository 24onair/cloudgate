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

// ── 월별 캐시 ─────────────────────────────────────────────────────
const _monthCache: Record<string, AllSchedules> = {};

async function loadMonth(yearMonth: string): Promise<AllSchedules> {
  if (_monthCache[yearMonth]) return _monthCache[yearMonth];
  try {
    const res = await fetch(`/api/schedules?year_month=${yearMonth}`);
    if (!res.ok) return {};
    const data = await res.json();
    _monthCache[yearMonth] = data;
    return data;
  } catch {
    return {};
  }
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
      // 캐시에서 재구성
      const merged: AllSchedules = {};
      for (const m of Object.values(_monthCache)) {
        for (const [pid, dates] of Object.entries(m)) {
          merged[pid] = { ...(merged[pid] ?? {}), ...dates };
        }
      }
      setSchedules({ ...merged });
    };
    window.addEventListener(EVENT_KEY, refresh);
    return () => window.removeEventListener(EVENT_KEY, refresh);
  }, []);

  return schedules;
}
