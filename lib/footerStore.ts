"use client";

import { useEffect, useState } from "react";

export interface FooterConfig {
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

const STORE_KEY = "gureum_footer";
const EVENT_KEY = "gureum_footer_update";

const DEFAULT: FooterConfig = {
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

function load(): FooterConfig {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? { ...DEFAULT, ...JSON.parse(raw) } : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

function save(c: FooterConfig) {
  localStorage.setItem(STORE_KEY, JSON.stringify(c));
  window.dispatchEvent(new Event(EVENT_KEY));
}

export function getFooter(): FooterConfig { return load(); }
export function setFooter(patch: Partial<FooterConfig>) { save({ ...load(), ...patch }); }

export function useFooter(): FooterConfig {
  const [config, setConfig] = useState<FooterConfig>(DEFAULT);
  useEffect(() => {
    const refresh = () => setConfig(load());
    refresh();
    window.addEventListener(EVENT_KEY, refresh);
    return () => window.removeEventListener(EVENT_KEY, refresh);
  }, []);
  return config;
}
