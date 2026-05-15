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
  nx: number;
  ny: number;
  lat?: number;
  lng?: number;
  altitude: number;
  windDirections: Record<WindDir16, WindDirGrade>;
  active: boolean;
  createdAt: string;
}

export function defaultWindDirs(): Record<WindDir16, WindDirGrade> {
  return Object.fromEntries(
    WIND_DIR_16.map((d) => [d, "conditional" as WindDirGrade])
  ) as Record<WindDir16, WindDirGrade>;
}

// ── 기본 이륙장 (DB가 비어 있을 때 seed) ────────────────────────
const DEFAULT_SITE: LaunchSite = {
  id: "site_mungyeong",
  name: "문경 이륙장",
  location: "경북 문경시 가은읍",
  nx: 96, ny: 98, lat: 36.59, lng: 128.07, altitude: 850,
  windDirections: {
    N: "reject", NNE: "caution", NE: "best",         ENE: "best",
    E: "best",   ESE: "conditional", SE: "caution",  SSE: "reject",
    S: "reject", SSW: "caution", SW: "conditional",  WSW: "best",
    W: "best",   WNW: "best",   NW: "conditional",   NNW: "caution",
  },
  active: true,
  createdAt: "2026-01-01T00:00:00.000Z",
};

const EVENT_KEY = "gureum_launch_sites_update";

// ── DB row → store 타입 변환 ───────────────────────────────────
function mapRow(row: Record<string, unknown>): LaunchSite {
  return {
    id:             row.id as string,
    name:           row.name as string,
    location:       (row.location as string) ?? "",
    nx:             (row.nx as number) ?? 0,
    ny:             (row.ny as number) ?? 0,
    lat:            row.lat as number | undefined,
    lng:            row.lng as number | undefined,
    altitude:       (row.altitude as number) ?? 0,
    windDirections: { ...defaultWindDirs(), ...(row.wind_directions as Record<WindDir16, WindDirGrade>) },
    active:         (row.active as boolean) ?? true,
    createdAt:      row.created_at as string,
  };
}

// ── 모듈 캐시 ────────────────────────────────────────────────────
let _cache: LaunchSite[] = [DEFAULT_SITE];
let _loaded = false;

async function fetchFromApi(): Promise<LaunchSite[]> {
  const res = await fetch("/api/launch-sites");
  if (!res.ok) return [DEFAULT_SITE];
  const rows = await res.json() as Record<string, unknown>[];
  if (!rows || rows.length === 0) {
    await seedDefault();
    return [DEFAULT_SITE];
  }
  return rows.map(mapRow);
}

async function seedDefault() {
  await fetch("/api/launch-sites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...DEFAULT_SITE, windDirections: DEFAULT_SITE.windDirections, sortOrder: 0 }),
  });
}

function notify() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT_KEY));
}

// ── 공개 CRUD ────────────────────────────────────────────────────
export function getLaunchSites(): LaunchSite[] { return _cache; }

export async function addLaunchSite(site: Omit<LaunchSite, "id" | "createdAt">) {
  const id = `site_${Date.now()}`;
  const next: LaunchSite = {
    ...site,
    windDirections: { ...defaultWindDirs(), ...site.windDirections },
    id,
    createdAt: new Date().toISOString(),
  };
  _cache = [..._cache, next];
  notify();

  const res = await fetch("/api/launch-sites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...next, windDirections: next.windDirections, sortOrder: _cache.length }),
  });
  if (res.ok) {
    const row = await res.json() as Record<string, unknown>;
    const created = mapRow(row);
    _cache = _cache.map((s) => (s.id === id ? created : s));
    notify();
    return created;
  }
  return next;
}

export async function updateLaunchSite(updated: LaunchSite) {
  _cache = _cache.map((s) => (s.id === updated.id ? updated : s));
  notify();
  await fetch(`/api/launch-sites/${updated.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: updated.name, location: updated.location,
      nx: updated.nx, ny: updated.ny, lat: updated.lat, lng: updated.lng,
      altitude: updated.altitude, windDirections: updated.windDirections, active: updated.active,
    }),
  });
}

export async function deleteLaunchSite(id: string) {
  _cache = _cache.filter((s) => s.id !== id);
  notify();
  await fetch(`/api/launch-sites/${id}`, { method: "DELETE" });
}

// ── Hook ────────────────────────────────────────────────────────
export function useLaunchSites() {
  const [sites, setSites] = useState<LaunchSite[]>(_cache);

  useEffect(() => {
    const refresh = () => setSites([..._cache]);
    window.addEventListener(EVENT_KEY, refresh);

    if (!_loaded) {
      _loaded = true;
      fetchFromApi().then((data) => {
        _cache = data;
        notify();
      });
    } else {
      refresh();
    }

    return () => window.removeEventListener(EVENT_KEY, refresh);
  }, []);

  return sites;
}

// ── 풍향 변환 (순수 유틸) ────────────────────────────────────────
export function degToDir16(deg: number): WindDir16 {
  const idx = Math.round(((deg % 360) + 360) % 360 / 22.5) % 16;
  return WIND_DIR_16[idx];
}

export function degToKorean(deg: number): string {
  const labels = [
    "북","북북동","북동","동북동","동","동남동","남동","남남동",
    "남","남남서","남서","서남서","서","서북서","북서","북북서",
  ];
  return labels[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16];
}

export type FlightGrade = "GREEN" | "YELLOW" | "RED";

export function calcFlightGrade(
  windSpeed: number,
  windDir16: WindDir16,
  site: LaunchSite | null
): { grade: FlightGrade; speedGrade: FlightGrade; dirGrade: FlightGrade; dirWindGrade: WindDirGrade } {
  const speedGrade: FlightGrade =
    windSpeed <= 5 ? "GREEN" : windSpeed <= 8 ? "YELLOW" : "RED";

  const windDirGrade: WindDirGrade = site?.windDirections[windDir16] ?? "best";
  const dirGrade: FlightGrade =
    windDirGrade === "reject" ? "RED"
    : windDirGrade === "caution" ? "YELLOW"
    : "GREEN";

  const order: Record<FlightGrade, number> = { GREEN: 0, YELLOW: 1, RED: 2 };
  const combined: FlightGrade =
    order[speedGrade] >= order[dirGrade] ? speedGrade : dirGrade;

  return { grade: combined, speedGrade, dirGrade, dirWindGrade: windDirGrade };
}

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
  const sf = Math.pow(Math.tan(Math.PI * 0.25 + slat1 * 0.5), sn) * Math.cos(slat1) / sn;
  const ro = re * sf / Math.pow(Math.tan(Math.PI * 0.25 + olat * 0.5), sn);

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
