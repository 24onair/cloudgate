"use client";

/**
 * 모바일 어드민 폼 임시저장 — localStorage 기반.
 *
 * 전화 응대 중 신호 끊김·탭 닫힘·새로고침 대비.
 * 같은 폰·같은 브라우저에서 복원 가능.
 *
 * 디자인 결정:
 *  - 만료: 24시간 (그 이후 자동 폐기, 전날 예약 끌고 오는 사고 방지)
 *  - 키 prefix: "gureum_m_draft__"
 *  - 빈 폼(필드 모두 비어있음) 저장 안 함
 *  - 저장 실패는 무시 (시크릿모드/quota 등)
 */

const KEY_PREFIX = "gureum_m_draft__";
const TTL_MS = 24 * 60 * 60 * 1000;

interface DraftWrapper<T> {
  ts: number;
  data: T;
}

export function saveDraft<T extends object>(slot: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    const wrap: DraftWrapper<T> = { ts: Date.now(), data };
    window.localStorage.setItem(KEY_PREFIX + slot, JSON.stringify(wrap));
  } catch {
    /* quota / private mode — 무시 */
  }
}

export function loadDraft<T>(slot: string): { data: T; ageMs: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY_PREFIX + slot);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftWrapper<T>;
    if (!parsed || typeof parsed.ts !== "number") return null;
    const age = Date.now() - parsed.ts;
    if (age > TTL_MS) {
      window.localStorage.removeItem(KEY_PREFIX + slot);
      return null;
    }
    return { data: parsed.data, ageMs: age };
  } catch {
    return null;
  }
}

export function clearDraft(slot: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY_PREFIX + slot);
  } catch {
    /* ignore */
  }
}

export function formatAge(ms: number): string {
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}초 전`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  return `${hr}시간 전`;
}
