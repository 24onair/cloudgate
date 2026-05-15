"use client";

import { useEffect, useState } from "react";

export interface LogoConfig {
  imageDataUrl: string | null; // 업로드된 로고 이미지
  showText: boolean;           // 텍스트 함께 표시 여부
  text: string;                // 타이틀 텍스트 (기본 "구름상회")
}

const EVENT_KEY = "gureum_logo_update";

const DEFAULT: LogoConfig = {
  imageDataUrl: null,
  showText: true,
  text: "구름상회",
};

let _cache: LogoConfig | null = null;

async function loadFromApi(): Promise<LogoConfig> {
  try {
    const res = await fetch("/api/site-settings/logo");
    if (!res.ok) return DEFAULT;
    const json = await res.json();
    if (!json || !json.value) return DEFAULT;
    _cache = { ...DEFAULT, ...json.value };
    return _cache!;
  } catch {
    return DEFAULT;
  }
}

async function saveToApi(data: LogoConfig): Promise<void> {
  _cache = data;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT_KEY));
  try {
    await fetch("/api/site-settings/logo", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: data }),
    });
  } catch { /* ignore */ }
}

export function getLogo(): LogoConfig {
  return _cache ?? DEFAULT;
}

export function setLogo(patch: Partial<LogoConfig>) {
  const current = _cache ?? DEFAULT;
  saveToApi({ ...current, ...patch });
}

export function clearLogoImage() {
  const current = _cache ?? DEFAULT;
  saveToApi({ ...current, imageDataUrl: null });
}

export function useLogo(): LogoConfig {
  const [config, setConfig] = useState<LogoConfig>(_cache ?? DEFAULT);
  useEffect(() => {
    let mounted = true;
    if (!_cache) {
      loadFromApi().then((d) => { if (mounted) setConfig(d); });
    }
    const refresh = () => { if (_cache) setConfig({ ..._cache! }); };
    window.addEventListener(EVENT_KEY, refresh);
    return () => {
      mounted = false;
      window.removeEventListener(EVENT_KEY, refresh);
    };
  }, []);
  return config;
}
