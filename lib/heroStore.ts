"use client";

import { useEffect, useState } from "react";

export interface HeroBgConfig {
  imageDataUrl: string | null;
  enabled: boolean;
  overlayOpacity: number; // 0~100, 기본 65 (오버레이 불투명도)
}

const STORAGE_KEY = "gureum_hero_bg";
const EVENT_KEY   = "gureum_hero_bg_update";

const DEFAULT_CONFIG: HeroBgConfig = {
  imageDataUrl: null,
  enabled: false,
  overlayOpacity: 65,
};

function load(): HeroBgConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function save(config: HeroBgConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  window.dispatchEvent(new Event(EVENT_KEY));
}

export function getHeroBg(): HeroBgConfig {
  return load();
}

export function setHeroBg(config: Partial<HeroBgConfig>) {
  save({ ...load(), ...config });
}

export function clearHeroBgImage() {
  save({ ...load(), imageDataUrl: null, enabled: false });
}

// ── Hook ─────────────────────────────────────────────────────────
export function useHeroBg() {
  const [config, setConfig] = useState<HeroBgConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    const refresh = () => setConfig(load());
    refresh();
    window.addEventListener(EVENT_KEY, refresh);
    return () => window.removeEventListener(EVENT_KEY, refresh);
  }, []);

  return config;
}
