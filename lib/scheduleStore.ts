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

export const PILOTS_META: PilotMeta[] = [
  { id: "p1", name: "박구름", initials: "박", avatarColor: "#2A7AE2" },
  { id: "p2", name: "김하늘", initials: "김", avatarColor: "#10B981" },
  { id: "p3", name: "이바람", initials: "이", avatarColor: "#FF8A00" },
  { id: "p4", name: "최하람", initials: "최", avatarColor: "#8B5CF6" },
];

export const SCHEDULE_CFG: Record<ScheduleStatus, { label: string; color: string; bg: string }> = {
  working: { label: "출근",  color: "#2A7AE2", bg: "#EFF6FF" },
  standby: { label: "대기",  color: "#10B981", bg: "#ECFDF5" },
  off:     { label: "휴무",  color: "#6B7280", bg: "#F3F4F6" },
  etc:     { label: "기타",  color: "#8B5CF6", bg: "#F5F3FF" },
};

const STORAGE_KEY = "gureum_schedule";
const EVENT_KEY   = "gureum_schedule_update";

// 관리자 파일럿장 Mock 데이터와 동일한 기본값
const DEFAULT_SCHEDULES: AllSchedules = {
  p1: {
    "2026-05-01": "working", "2026-05-02": "working", "2026-05-03": "off",
    "2026-05-04": "working", "2026-05-05": "working", "2026-05-06": "working",
    "2026-05-07": "working", "2026-05-08": "standby", "2026-05-09": "working",
    "2026-05-10": "off",     "2026-05-11": "working", "2026-05-12": "working",
    "2026-05-13": "working", "2026-05-14": "working", "2026-05-15": "off",
    "2026-05-16": "working", "2026-05-17": "off",     "2026-05-18": "working",
    "2026-05-19": "working", "2026-05-20": "standby", "2026-05-21": "working",
    "2026-05-22": "working", "2026-05-23": "working", "2026-05-24": "off",
    "2026-05-25": "working", "2026-05-26": "working", "2026-05-27": "working",
    "2026-05-28": "working", "2026-05-29": "working", "2026-05-30": "off",
    "2026-05-31": "working",
  },
  p2: {
    "2026-05-01": "working", "2026-05-02": "standby", "2026-05-03": "off",
    "2026-05-04": "working", "2026-05-05": "working", "2026-05-06": "etc",
    "2026-05-07": "etc",   "2026-05-08": "working", "2026-05-09": "working",
    "2026-05-10": "off",     "2026-05-11": "standby", "2026-05-12": "working",
    "2026-05-13": "working", "2026-05-14": "working", "2026-05-15": "off",
    "2026-05-16": "working", "2026-05-17": "working", "2026-05-18": "off",
    "2026-05-19": "working", "2026-05-20": "working", "2026-05-21": "working",
    "2026-05-22": "off",     "2026-05-23": "working", "2026-05-24": "working",
    "2026-05-25": "off",     "2026-05-26": "working", "2026-05-27": "working",
    "2026-05-28": "working", "2026-05-29": "off",     "2026-05-30": "working",
    "2026-05-31": "working",
  },
  p3: {
    "2026-05-01": "standby", "2026-05-02": "working", "2026-05-03": "off",
    "2026-05-04": "standby", "2026-05-05": "working", "2026-05-06": "working",
    "2026-05-07": "working", "2026-05-08": "off",     "2026-05-09": "standby",
    "2026-05-10": "off",     "2026-05-11": "working", "2026-05-12": "working",
    "2026-05-13": "working", "2026-05-14": "off",     "2026-05-15": "working",
    "2026-05-16": "working", "2026-05-17": "working", "2026-05-18": "off",
    "2026-05-19": "standby", "2026-05-20": "working", "2026-05-21": "working",
    "2026-05-22": "off",     "2026-05-23": "working", "2026-05-24": "working",
    "2026-05-25": "working", "2026-05-26": "off",     "2026-05-27": "working",
    "2026-05-28": "working", "2026-05-29": "working", "2026-05-30": "off",
    "2026-05-31": "standby",
  },
  p4: {
    "2026-05-01": "etc",   "2026-05-02": "etc",   "2026-05-03": "etc",
    "2026-05-04": "etc",   "2026-05-05": "etc",   "2026-05-06": "etc",
    "2026-05-07": "etc",   "2026-05-08": "etc",   "2026-05-09": "etc",
    "2026-05-10": "etc",   "2026-05-11": "etc",   "2026-05-12": "etc",
    "2026-05-13": "etc",   "2026-05-14": "etc",   "2026-05-15": "etc",
    "2026-05-16": "working", "2026-05-17": "working", "2026-05-18": "off",
    "2026-05-19": "working", "2026-05-20": "working", "2026-05-21": "working",
    "2026-05-22": "off",     "2026-05-23": "working", "2026-05-24": "working",
    "2026-05-25": "working", "2026-05-26": "off",     "2026-05-27": "working",
    "2026-05-28": "working", "2026-05-29": "working", "2026-05-30": "off",
    "2026-05-31": "working",
  },
};

function migrateSchedules(data: AllSchedules): AllSchedules {
  // "leave" → "etc" 마이그레이션 (구버전 localStorage 호환)
  let dirty = false;
  const result: AllSchedules = {};
  for (const [pid, dates] of Object.entries(data)) {
    result[pid] = {};
    for (const [date, status] of Object.entries(dates)) {
      const s = status === ("leave" as string) ? "etc" : (status as ScheduleStatus);
      if (s !== status) dirty = true;
      result[pid][date] = s;
    }
  }
  if (dirty) localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
  return result;
}

function load(): AllSchedules {
  if (typeof window === "undefined") return DEFAULT_SCHEDULES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SCHEDULES;
    return migrateSchedules(JSON.parse(raw));
  } catch {
    return DEFAULT_SCHEDULES;
  }
}

function save(data: AllSchedules) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  window.dispatchEvent(new Event(EVENT_KEY));
}

export function getSchedules(): AllSchedules {
  return load();
}

export function getPilotSchedule(pilotId: string): ScheduleMap {
  return load()[pilotId] ?? {};
}

export function updatePilotSchedule(pilotId: string, date: string, status: ScheduleStatus) {
  const data = load();
  if (!data[pilotId]) data[pilotId] = {};
  data[pilotId][date] = status;
  save(data);
}

// ── 기타 사유 노트 ─────────────────────────────────────────────────
const NOTES_KEY = "gureum_schedule_notes";

function loadNotes(): AllScheduleNotes {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveNotes(data: AllScheduleNotes) {
  localStorage.setItem(NOTES_KEY, JSON.stringify(data));
  window.dispatchEvent(new Event(EVENT_KEY));
}

export function updatePilotNote(pilotId: string, date: string, note: string) {
  const data = loadNotes();
  if (!data[pilotId]) data[pilotId] = {};
  if (note.trim()) {
    data[pilotId][date] = note.trim();
  } else {
    delete data[pilotId][date];
  }
  saveNotes(data);
}

export function getScheduleNotes(): AllScheduleNotes {
  return loadNotes();
}

export function useScheduleNotes() {
  const [notes, setNotes] = useState<AllScheduleNotes>({});

  useEffect(() => {
    const refresh = () => setNotes(loadNotes());
    refresh();
    window.addEventListener(EVENT_KEY, refresh);
    return () => window.removeEventListener(EVENT_KEY, refresh);
  }, []);

  return notes;
}

export function useSchedules() {
  const [schedules, setSchedules] = useState<AllSchedules>(DEFAULT_SCHEDULES);

  useEffect(() => {
    const refresh = () => setSchedules(load());
    refresh();
    window.addEventListener(EVENT_KEY, refresh);
    return () => window.removeEventListener(EVENT_KEY, refresh);
  }, []);

  return schedules;
}
