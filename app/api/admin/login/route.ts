import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  adminCookieOptions,
  getAdminPassword,
  getSessionSecret,
  signSession,
} from "@/lib/auth/session";
import {
  checkRateLimit,
  clearFailures,
  clientIp,
  registerFailure,
  type RateLimitPolicy,
} from "@/lib/auth/rateLimit";

// 관리자 비번은 단일 자격증명 → IP 기준 5회/10분.
const ADMIN_LOGIN_POLICY: RateLimitPolicy = { max: 5, windowMs: 10 * 60 * 1000 };

// POST /api/admin/login
export async function POST(req: NextRequest) {
  let secret: string;
  let correct: string;
  try {
    secret = getSessionSecret();
    correct = getAdminPassword();
  } catch (e) {
    console.error("[admin/login] env misconfigured:", e);
    return NextResponse.json({ error: "서버 설정 오류" }, { status: 500 });
  }

  const rlKey = `admin:${clientIp(req)}`;
  const rl = checkRateLimit(rlKey, ADMIN_LOGIN_POLICY);
  if (rl.limited) {
    return NextResponse.json(
      { error: `로그인 시도가 많습니다. ${rl.retryAfterSec}초 후 다시 시도하세요.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  let password: unknown;
  try {
    ({ password } = await req.json());
  } catch {
    return NextResponse.json({ error: "요청 오류" }, { status: 400 });
  }

  if (typeof password !== "string" || password !== correct) {
    registerFailure(rlKey, ADMIN_LOGIN_POLICY);
    return NextResponse.json(
      { error: "비밀번호가 올바르지 않습니다." },
      { status: 401 },
    );
  }

  clearFailures(rlKey);
  const token = await signSession({ sub: "admin", role: "admin" }, secret);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, adminCookieOptions());
  return res;
}
