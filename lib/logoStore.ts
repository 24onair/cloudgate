"use client";

import { useEffect, useState } from "react";

export interface LogoConfig {
  imageDataUrl: string | null; // 업로드된 로고 이미지
  showText: boolean;           // 텍스트 함께 표시 여부
  text: string;                // 타이틀 텍스트 (기본 "구름상회")
}

const STORE_KEY   = "gureum_logo";
const EVENT_KEY   = "gureum_logo_update";

const DEFAULT: LogoConfig = {
  imageDataUrl: null,
  showText: true,
  text: "구름상회",
};

function load(): LogoConfig {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? { ...DEFAULT, ...JSON.parse(raw) } : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

function save(c: LogoConfig) {
  localStorage.setItem(STORE_KEY, JSON.stringify(c));
  window.dispatchEvent(new Event(EVENT_KEY));
}

export function getLogo(): LogoConfig { return load(); }
export function setLogo(patch: Partial<LogoConfig>) { save({ ...load(), ...patch }); }
export function clearLogoImage() { save({ ...load(), imageDataUrl: null }); }

export function useLogo(): LogoConfig {
  const [config, setConfig] = useState<LogoConfig>(DEFAULT);
  useEffect(() => {
    const refresh = () => setConfig(load());
    refresh();
    window.addEventListener(EVENT_KEY, refresh);
    return () => window.removeEventListener(EVENT_KEY, refresh);
  }, []);
  return config;
}
