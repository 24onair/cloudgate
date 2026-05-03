"use client";

import { useEffect, useState } from "react";

export interface HeroBgConfig {
  imageDataUrl: string | null;
  enabled: boolean;
  overlayOpacity: number; // 0~100, 기본 65 (오버레이 불투명도)
}

// ── 히어로 섹션 ──────────────────────────────────────────────────
const HERO_KEY       = "gureum_hero_bg";
const HERO_EVENT_KEY = "gureum_hero_bg_update";

const HERO_DEFAULT: HeroBgConfig = { imageDataUrl: null, enabled: false, overlayOpacity: 65 };

function loadHero(): HeroBgConfig {
  if (typeof window === "undefined") return HERO_DEFAULT;
  try { const raw = localStorage.getItem(HERO_KEY); return raw ? { ...HERO_DEFAULT, ...JSON.parse(raw) } : HERO_DEFAULT; }
  catch { return HERO_DEFAULT; }
}
function saveHero(c: HeroBgConfig) {
  localStorage.setItem(HERO_KEY, JSON.stringify(c));
  window.dispatchEvent(new Event(HERO_EVENT_KEY));
}

export function getHeroBg(): HeroBgConfig { return loadHero(); }
export function setHeroBg(config: Partial<HeroBgConfig>) { saveHero({ ...loadHero(), ...config }); }
export function clearHeroBgImage() { saveHero({ ...loadHero(), imageDataUrl: null, enabled: false }); }

export function useHeroBg() {
  const [config, setConfig] = useState<HeroBgConfig>(HERO_DEFAULT);
  useEffect(() => {
    const refresh = () => setConfig(loadHero());
    refresh();
    window.addEventListener(HERO_EVENT_KEY, refresh);
    return () => window.removeEventListener(HERO_EVENT_KEY, refresh);
  }, []);
  return config;
}

// ── CTA 섹션 ─────────────────────────────────────────────────────
const CTA_KEY       = "gureum_cta_bg";
const CTA_EVENT_KEY = "gureum_cta_bg_update";

const CTA_DEFAULT: HeroBgConfig = { imageDataUrl: null, enabled: false, overlayOpacity: 70 };

function loadCta(): HeroBgConfig {
  if (typeof window === "undefined") return CTA_DEFAULT;
  try { const raw = localStorage.getItem(CTA_KEY); return raw ? { ...CTA_DEFAULT, ...JSON.parse(raw) } : CTA_DEFAULT; }
  catch { return CTA_DEFAULT; }
}
function saveCta(c: HeroBgConfig) {
  localStorage.setItem(CTA_KEY, JSON.stringify(c));
  window.dispatchEvent(new Event(CTA_EVENT_KEY));
}

export function getCtaBg(): HeroBgConfig { return loadCta(); }
export function setCtaBg(config: Partial<HeroBgConfig>) { saveCta({ ...loadCta(), ...config }); }
export function clearCtaBgImage() { saveCta({ ...loadCta(), imageDataUrl: null, enabled: false }); }

export function useCtaBg() {
  const [config, setConfig] = useState<HeroBgConfig>(CTA_DEFAULT);
  useEffect(() => {
    const refresh = () => setConfig(loadCta());
    refresh();
    window.addEventListener(CTA_EVENT_KEY, refresh);
    return () => window.removeEventListener(CTA_EVENT_KEY, refresh);
  }, []);
  return config;
}
