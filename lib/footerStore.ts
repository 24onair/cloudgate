"use client";

import { useEffect, useState } from "react";

export interface FooterConfig {
  bizName: string;
  tagline: string;
  hoursWeekday: string;
  hoursWeekend: string;
  hoursNotice: string;
  phone: string;
  kakao: string;
  address: string;
  copyright: string;
  bizInfo: string;
}

const EVENT_KEY = "gureum_footer_update";

const DEFAULT: FooterConfig = {
  bizName:      "단양 하늘체험 패러글라이딩",
  tagline:      "하늘을 가장 가까이서 만나는 곳.\n패러글라이딩 체험비행 전문 업체.",
  hoursWeekday: "평일 09:00 ~ 18:00",
  hoursWeekend: "주말 07:00 ~ 19:00",
  hoursNotice:  "기상 악화 시 당일 공지",
  phone:        "010-0000-0000",
  kakao:        "카카오톡 채널",
  address:      "강원도 ○○군 ○○면",
  copyright:    "© 2026 구름상회. All rights reserved.",
  bizInfo:      "사업자등록번호 000-00-00000 · 대표 홍길동",
};

let _cache: FooterConfig | null = null;

async function loadFromApi(): Promise<FooterConfig> {
  try {
    const res = await fetch("/api/site-settings/footer");
    if (!res.ok) return DEFAULT;
    const json = await res.json();
    if (!json || !json.value) return DEFAULT;
    _cache = { ...DEFAULT, ...json.value };
    return _cache!;
  } catch {
    return DEFAULT;
  }
}

async function saveToApi(data: FooterConfig): Promise<void> {
  _cache = data;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT_KEY));
  try {
    await fetch("/api/site-settings/footer", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: data }),
    });
  } catch { /* ignore */ }
}

export function getFooter(): FooterConfig {
  return _cache ?? DEFAULT;
}

export function setFooter(patch: Partial<FooterConfig>) {
  const current = _cache ?? DEFAULT;
  saveToApi({ ...current, ...patch });
}

export function useFooter(): FooterConfig {
  const [config, setConfig] = useState<FooterConfig>(_cache ?? DEFAULT);
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
