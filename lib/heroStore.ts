"use client";

import { useEffect, useState } from "react";

export interface HeroBgConfig {
  imageDataUrl: string | null;
  enabled: boolean;
  overlayOpacity: number;   // 0~100, 기본 65
  objectPosition: string;   // CSS object-position, 기본 "50% 50%"
}

// ── 히어로 섹션 ──────────────────────────────────────────────────
const HERO_EVENT_KEY = "gureum_hero_bg_update";
const HERO_DEFAULT: HeroBgConfig = { imageDataUrl: null, enabled: false, overlayOpacity: 65, objectPosition: "50% 50%" };

let _heroCache: HeroBgConfig | null = null;

async function loadHeroFromApi(): Promise<HeroBgConfig> {
  try {
    const res = await fetch("/api/site-settings/hero_bg");
    if (!res.ok) return HERO_DEFAULT;
    const json = await res.json();
    if (!json || !json.value) return HERO_DEFAULT;
    _heroCache = { ...HERO_DEFAULT, ...json.value };
    return _heroCache!;
  } catch {
    return HERO_DEFAULT;
  }
}

async function saveHeroToApi(data: HeroBgConfig): Promise<void> {
  _heroCache = data;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(HERO_EVENT_KEY));
  try {
    await fetch("/api/site-settings/hero_bg", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: data }),
    });
  } catch { /* ignore */ }
}

export function getHeroBg(): HeroBgConfig { return _heroCache ?? HERO_DEFAULT; }
export function setHeroBg(config: Partial<HeroBgConfig>) { saveHeroToApi({ ...(_heroCache ?? HERO_DEFAULT), ...config }); }
export function clearHeroBgImage() { saveHeroToApi({ ...(_heroCache ?? HERO_DEFAULT), imageDataUrl: null, enabled: false }); }

export function useHeroBg() {
  const [config, setConfig] = useState<HeroBgConfig>(_heroCache ?? HERO_DEFAULT);
  useEffect(() => {
    let mounted = true;
    if (!_heroCache) {
      loadHeroFromApi().then((d) => { if (mounted) setConfig(d); });
    }
    const refresh = () => { if (_heroCache) setConfig({ ..._heroCache! }); };
    window.addEventListener(HERO_EVENT_KEY, refresh);
    return () => {
      mounted = false;
      window.removeEventListener(HERO_EVENT_KEY, refresh);
    };
  }, []);
  return config;
}

// ── CTA 섹션 ─────────────────────────────────────────────────────
const CTA_EVENT_KEY = "gureum_cta_bg_update";
const CTA_DEFAULT: HeroBgConfig = { imageDataUrl: null, enabled: false, overlayOpacity: 70, objectPosition: "50% 50%" };

let _ctaCache: HeroBgConfig | null = null;

async function loadCtaFromApi(): Promise<HeroBgConfig> {
  try {
    const res = await fetch("/api/site-settings/cta_bg");
    if (!res.ok) return CTA_DEFAULT;
    const json = await res.json();
    if (!json || !json.value) return CTA_DEFAULT;
    _ctaCache = { ...CTA_DEFAULT, ...json.value };
    return _ctaCache!;
  } catch {
    return CTA_DEFAULT;
  }
}

async function saveCtaToApi(data: HeroBgConfig): Promise<void> {
  _ctaCache = data;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CTA_EVENT_KEY));
  try {
    await fetch("/api/site-settings/cta_bg", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: data }),
    });
  } catch { /* ignore */ }
}

export function getCtaBg(): HeroBgConfig { return _ctaCache ?? CTA_DEFAULT; }
export function setCtaBg(config: Partial<HeroBgConfig>) { saveCtaToApi({ ...(_ctaCache ?? CTA_DEFAULT), ...config }); }
export function clearCtaBgImage() { saveCtaToApi({ ...(_ctaCache ?? CTA_DEFAULT), imageDataUrl: null, enabled: false }); }

export function useCtaBg() {
  const [config, setConfig] = useState<HeroBgConfig>(_ctaCache ?? CTA_DEFAULT);
  useEffect(() => {
    let mounted = true;
    if (!_ctaCache) {
      loadCtaFromApi().then((d) => { if (mounted) setConfig(d); });
    }
    const refresh = () => { if (_ctaCache) setConfig({ ..._ctaCache! }); };
    window.addEventListener(CTA_EVENT_KEY, refresh);
    return () => {
      mounted = false;
      window.removeEventListener(CTA_EVENT_KEY, refresh);
    };
  }, []);
  return config;
}

// ── FAQ 섹션 ──────────────────────────────────────────────────────
const FAQ_EVENT_KEY = "gureum_faq_bg_update";
const FAQ_DEFAULT: HeroBgConfig = { imageDataUrl: null, enabled: false, overlayOpacity: 60, objectPosition: "50% 50%" };

let _faqCache: HeroBgConfig | null = null;

async function loadFaqFromApi(): Promise<HeroBgConfig> {
  try {
    const res = await fetch("/api/site-settings/faq_bg");
    if (!res.ok) return FAQ_DEFAULT;
    const json = await res.json();
    if (!json || !json.value) return FAQ_DEFAULT;
    _faqCache = { ...FAQ_DEFAULT, ...json.value };
    return _faqCache!;
  } catch {
    return FAQ_DEFAULT;
  }
}

async function saveFaqToApi(data: HeroBgConfig): Promise<void> {
  _faqCache = data;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(FAQ_EVENT_KEY));
  try {
    await fetch("/api/site-settings/faq_bg", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: data }),
    });
  } catch { /* ignore */ }
}

export function getFaqBg(): HeroBgConfig { return _faqCache ?? FAQ_DEFAULT; }
export function setFaqBg(config: Partial<HeroBgConfig>) { saveFaqToApi({ ...(_faqCache ?? FAQ_DEFAULT), ...config }); }
export function clearFaqBgImage() { saveFaqToApi({ ...(_faqCache ?? FAQ_DEFAULT), imageDataUrl: null, enabled: false }); }

export function useFaqBg() {
  const [config, setConfig] = useState<HeroBgConfig>(_faqCache ?? FAQ_DEFAULT);
  useEffect(() => {
    let mounted = true;
    if (!_faqCache) {
      loadFaqFromApi().then((d) => { if (mounted) setConfig(d); });
    }
    const refresh = () => { if (_faqCache) setConfig({ ..._faqCache! }); };
    window.addEventListener(FAQ_EVENT_KEY, refresh);
    return () => {
      mounted = false;
      window.removeEventListener(FAQ_EVENT_KEY, refresh);
    };
  }, []);
  return config;
}
