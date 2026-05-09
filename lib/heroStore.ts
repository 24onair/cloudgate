"use client";

import { useEffect, useState } from "react";

export interface HeroBgConfig {
  imageDataUrl: string | null;
  enabled: boolean;
  overlayOpacity: number;   // 0~100, 기본 65
  objectPosition: string;   // CSS object-position, 기본 "50% 50%"
}

// ── 히어로 섹션 ──────────────────────────────────────────────────
const HERO_KEY       = "gureum_hero_bg";
const HERO_EVENT_KEY = "gureum_hero_bg_update";

const HERO_DEFAULT: HeroBgConfig = { imageDataUrl: null, enabled: false, overlayOpacity: 65, objectPosition: "50% 50%" };

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

const CTA_DEFAULT: HeroBgConfig = { imageDataUrl: null, enabled: false, overlayOpacity: 70, objectPosition: "50% 50%" };

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

// ── FAQ 섹션 ──────────────────────────────────────────────────────
const FAQ_KEY       = "gureum_faq_bg";
const FAQ_EVENT_KEY = "gureum_faq_bg_update";

const FAQ_DEFAULT: HeroBgConfig = { imageDataUrl: null, enabled: false, overlayOpacity: 60, objectPosition: "50% 50%" };

function loadFaq(): HeroBgConfig {
  if (typeof window === "undefined") return FAQ_DEFAULT;
  try { const raw = localStorage.getItem(FAQ_KEY); return raw ? { ...FAQ_DEFAULT, ...JSON.parse(raw) } : FAQ_DEFAULT; }
  catch { return FAQ_DEFAULT; }
}
function saveFaq(c: HeroBgConfig) {
  localStorage.setItem(FAQ_KEY, JSON.stringify(c));
  window.dispatchEvent(new Event(FAQ_EVENT_KEY));
}

export function getFaqBg(): HeroBgConfig { return loadFaq(); }
export function setFaqBg(config: Partial<HeroBgConfig>) { saveFaq({ ...loadFaq(), ...config }); }
export function clearFaqBgImage() { saveFaq({ ...loadFaq(), imageDataUrl: null, enabled: false }); }

export function useFaqBg() {
  const [config, setConfig] = useState<HeroBgConfig>(FAQ_DEFAULT);
  useEffect(() => {
    const refresh = () => setConfig(loadFaq());
    refresh();
    window.addEventListener(FAQ_EVENT_KEY, refresh);
    return () => window.removeEventListener(FAQ_EVENT_KEY, refresh);
  }, []);
  return config;
}
