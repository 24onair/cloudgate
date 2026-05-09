"use client";

import { useState, useEffect } from "react";

// ── 16방위 타입 ──────────────────────────────────────────────────
export type WindDir16 =
  | "N" | "NNE" | "NE" | "ENE"
  | "E" | "ESE" | "SE" | "SSE"
  | "S" | "SSW" | "SW" | "WSW"
  | "W" | "WNW" | "NW" | "NNW";

export const WIND_DIR_16: WindDir16[] = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
];

// Best: 이상적, Conditional: 비행 가능, Caution: 주의 필요, Reject: 비행 불가
export type WindDirGrade = "best" | "conditional" | "caution" | "reject";

export const WIND_DIR_GRADE_CFG: Record<
  WindDirGrade,
  { label: string; labelEn: string; color: string; bg: string; border: string }
> = {
  best:        { label: "최적",   labelEn: "Best",        color: "#059669", bg: "#ECFDF5", border: "#6EE7B7" },
  conditional: { label: "가능",   labelEn: "Conditional", color: "#2563EB", bg: "#EFF6FF", border: "#93C5FD" },
  caution:     { label: "주의",   labelEn: "Caution",     color: "#D97706", bg: "#FFFBEB", border: "#FCD34D" },
  reject:      { label: "불가",   labelEn: "Reject",      color: "#DC2626", bg: "#FEF2F2", border: "#FCA5A5" },
};

const GRADE_CYCLE: WindDirGrade[] = ["best", "conditional", "caution", "reject"];
export function cycleGrade(current: WindDirGrade): WindDirGrade {
  return GRADE_CYCLE[(GRADE_CYCLE.indexOf(current) + 1) % GRADE_CYCLE.length];
}

// ── 이륙장 인터페이스 ───────────────────────────────────────────
export interface LaunchSite {
  id: string;
  name: string;
  location: string;
  nx: number;          // 기상청 격자 X
  ny: number;          // 기상청 격자 Y
  lat?: number;        // 위도 (일출/일몰 계산용)
  lng?: number;        // 경도 (일출/일몰 계산용)
  altitude: number;    // 고도 (m)
  windDirections: Record<WindDir16, WindDirGrade>;
  active: boolean;
  createdAt: string;
}

export function defaultWindDirs(): Record<WindDir16, WindDirGrade> {
  return Object.fromEntries(
    WIND_DIR_16.map((d) => [d, "conditional" as WindDirGrade])
  ) as Record<WindDir16, WindDirGrade>;
}

// ── 기본 이륙장 데이터 ──────────────────────────────────────────
// TODO: API — 이륙장 localStorage → GET/POST/PATCH/DELETE /api/launch-sites
const DEFAULT_SITES: LaunchSite[] = [
  {
    id: "site_mungyeong",
    name: "문경 이륙장",
    location: "경북 문경시 가은읍",
    nx: 96,
    ny: 98,
    lat: 36.59,
    lng: 128.07,
    altitude: 850,
    windDirections: {
      N: "reject",      NNE: "caution",     NE: "best",      ENE: "best",
      E: "best",        ESE: "conditional", SE: "caution",   SSE: "reject",
      S: "reject",      SSW: "caution",     SW: "conditional", WSW: "best",
      W: "best",        WNW: "best",        NW: "conditional", NNW: "caution",
    },
    active: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];

// ── localStorage ────────────────────────────────────────────────
const STORAGE_KEY = "gureum_launch_sites";
const EVENT_KEY   = "gureum_launch_sites_update";

function load(): LaunchSite[] {
  if (typeof window === "undefined") return DEFAULT_SITES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SITES;
    const saved: LaunchSite[] = JSON.parse(raw);
    return saved.map((s) => ({
      ...s,
      windDirections: { ...defaultWindDirs(), ...s.windDirections },
    }));
  } catch {
    return DEFAULT_SITES;
  }
}

function save(sites: LaunchSite[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sites));
  window.dispatchEvent(new Event(EVENT_KEY));
}

export function getLaunchSites(): LaunchSite[] { return load(); }

export function addLaunchSite(site: Omit<LaunchSite, "id" | "createdAt">) {
  const next: LaunchSite = {
    ...site,
    windDirections: { ...defaultWindDirs(), ...site.windDirections },
    id: `site_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  save([...load(), next]);
  return next;
}

export function updateLaunchSite(updated: LaunchSite) {
  save(load().map((s) => (s.id === updated.id ? updated : s)));
}

export function deleteLaunchSite(id: string) {
  save(load().filter((s) => s.id !== id));
}

export function useLaunchSites() {
  const [sites, setSites] = useState<LaunchSite[]>(DEFAULT_SITES);
  useEffect(() => {
    const refresh = () => setSites(load());
    refresh();
    window.addEventListener(EVENT_KEY, refresh);
    return () => window.removeEventListener(EVENT_KEY, refresh);
  }, []);
  return sites;
}

// ── 풍향 변환 ────────────────────────────────────────────────────
/** VEC(도) → WindDir16 */
export function degToDir16(deg: number): WindDir16 {
  const idx = Math.round(((deg % 360) + 360) % 360 / 22.5) % 16;
  return WIND_DIR_16[idx];
}

/** VEC(도) → 한국어 방향명 */
export function degToKorean(deg: number): string {
  const labels = [
    "북","북북동","북동","동북동","동","동남동","남동","남남동",
    "남","남남서","남서","서남서","서","서북서","북서","북북서",
  ];
  return labels[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16];
}

// ── 비행 등급 계산 (풍속 + 풍향 통합) ───────────────────────────
export type FlightGrade = "GREEN" | "YELLOW" | "RED";

export function calcFlightGrade(
  windSpeed: number,
  windDir16: WindDir16,
  site: LaunchSite | null
): { grade: FlightGrade; speedGrade: FlightGrade; dirGrade: FlightGrade; dirWindGrade: WindDirGrade } {
  // 풍속 등급
  const speedGrade: FlightGrade =
    windSpeed <= 5 ? "GREEN" : windSpeed <= 8 ? "YELLOW" : "RED";

  // 풍향 등급 (이륙장 없으면 GREEN으로 처리)
  const windDirGrade: WindDirGrade = site?.windDirections[windDir16] ?? "best";
  const dirGrade: FlightGrade =
    windDirGrade === "reject" ? "RED"
    : windDirGrade === "caution" ? "YELLOW"
    : "GREEN"; // best, conditional 모두 GREEN

  // 최악 등급 적용
  const order: Record<FlightGrade, number> = { GREEN: 0, YELLOW: 1, RED: 2 };
  const combined: FlightGrade =
    order[speedGrade] >= order[dirGrade] ? speedGrade : dirGrade;

  return { grade: combined, speedGrade, dirGrade, dirWindGrade: windDirGrade };
}

// ── 위경도 → 기상청 격자 변환 ────────────────────────────────────
export function latlngToGrid(lat: number, lng: number): { nx: number; ny: number } {
  const RE = 6371.00877, GRID = 5.0;
  const SLAT1 = 30.0, SLAT2 = 60.0, OLON = 126.0, OLAT = 38.0;
  const XO = 43, YO = 136;
  const DEGRAD = Math.PI / 180.0;

  const re = RE / GRID;
  const slat1 = SLAT1 * DEGRAD, slat2 = SLAT2 * DEGRAD;
  const olon = OLON * DEGRAD, olat = OLAT * DEGRAD;

  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
  let sf = Math.pow(Math.tan(Math.PI * 0.25 + slat1 * 0.5), sn) * Math.cos(slat1) / sn;
  let ro = re * sf / Math.pow(Math.tan(Math.PI * 0.25 + olat * 0.5), sn);

  const ra = re * sf / Math.pow(Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5), sn);
  let theta = lng * DEGRAD - olon;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;

  return {
    nx: Math.floor(ra * Math.sin(theta) + XO + 0.5),
    ny: Math.floor(ro - ra * Math.cos(theta) + YO + 0.5),
  };
}
