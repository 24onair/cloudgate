import { NextRequest } from "next/server";

/**
 * 로그인 무차별 대입(brute-force) 방어용 경량 rate limiter.
 *
 * ⚠️ 인메모리 구현이라 서버리스(Vercel)에서는 인스턴스별로만 카운트된다.
 *    소규모 단일 업체 운영에는 1차 방어로 충분하지만, 본격 운영 시
 *    DB/Redis 백엔드(예: login_attempts 테이블)로 승격 권장. (BACKLOG)
 *
 * 정책: windowMs 안에서 실패가 max 회 누적되면 잠금. 잠금 중 추가 실패는
 *       lastFailAt 을 갱신해 잠금을 연장한다(지속 공격 차단). 성공 시 초기화.
 */

interface Entry {
  fails: number;
  lastFailAt: number;
}

const MAX_ENTRIES = 10_000; // 메모리 폭주 방지용 안전 상한
const store = new Map<string, Entry>();

export interface RateLimitPolicy {
  max: number;
  windowMs: number;
}

export interface RateLimitResult {
  limited: boolean;
  retryAfterSec: number;
}

/** 현재 키가 잠금 상태인지 확인(부수효과 없음). */
export function checkRateLimit(key: string, policy: RateLimitPolicy): RateLimitResult {
  const e = store.get(key);
  if (!e) return { limited: false, retryAfterSec: 0 };

  const now = Date.now();
  // 마지막 실패 이후 window 가 지났으면 만료 처리.
  if (now - e.lastFailAt >= policy.windowMs) {
    store.delete(key);
    return { limited: false, retryAfterSec: 0 };
  }
  if (e.fails >= policy.max) {
    const retryAfterSec = Math.max(1, Math.ceil((e.lastFailAt + policy.windowMs - now) / 1000));
    return { limited: true, retryAfterSec };
  }
  return { limited: false, retryAfterSec: 0 };
}

/** 로그인 실패 1건 기록. */
export function registerFailure(key: string, policy: RateLimitPolicy): void {
  const now = Date.now();
  const e = store.get(key);
  if (!e || now - e.lastFailAt >= policy.windowMs) {
    store.set(key, { fails: 1, lastFailAt: now });
  } else {
    e.fails += 1;
    e.lastFailAt = now;
  }
  evictIfNeeded(now);
}

/** 로그인 성공 시 카운터 초기화. */
export function clearFailures(key: string): void {
  store.delete(key);
}

/** 요청에서 클라이언트 IP 추정(프록시 헤더 우선). */
export function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

// 상한 초과 시 가장 오래된 항목부터 제거(간단한 GC).
function evictIfNeeded(now: number): void {
  if (store.size <= MAX_ENTRIES) return;
  let oldestKey: string | null = null;
  let oldestAt = now;
  for (const [k, v] of store) {
    if (v.lastFailAt < oldestAt) {
      oldestAt = v.lastFailAt;
      oldestKey = k;
    }
  }
  if (oldestKey) store.delete(oldestKey);
}
