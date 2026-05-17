import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  PILOT_COOKIE,
  clearCookieOptions,
  getSessionSecret,
  verifySession,
} from "@/lib/auth/session";

const ADMIN_LOGIN_PAGE = "/admin/login";
const PILOT_LOGIN_PAGE = "/pilot/login";

const ADMIN_API_WHITELIST = new Set<string>([
  "/api/admin/login",
]);
const PILOT_API_WHITELIST = new Set<string>([
  "/api/pilot/login",
]);

function isAdminPath(p: string) {
  return p === "/admin" || p.startsWith("/admin/") || p.startsWith("/api/admin/") || p === "/api/admin";
}

function isPilotPath(p: string) {
  return p === "/pilot" || p.startsWith("/pilot/") || p.startsWith("/api/pilot/") || p === "/api/pilot";
}

function unauthorized(req: NextRequest, scope: "admin" | "pilot", isApi: boolean): NextResponse {
  if (isApi) {
    const res = NextResponse.json({ error: "미인증" }, { status: 401 });
    res.cookies.set(scope === "admin" ? ADMIN_COOKIE : PILOT_COOKIE, "", clearCookieOptions());
    return res;
  }
  const loginUrl = new URL(scope === "admin" ? ADMIN_LOGIN_PAGE : PILOT_LOGIN_PAGE, req.url);
  const res = NextResponse.redirect(loginUrl);
  res.cookies.set(scope === "admin" ? ADMIN_COOKIE : PILOT_COOKIE, "", clearCookieOptions());
  return res;
}

/**
 * 서버 컴포넌트(특히 `app/admin/layout.tsx`)에서 현재 경로를 알 수 있도록
 * 요청 헤더에 pathname을 주입한 NextResponse.next()를 돌려준다.
 * 모바일 어드민(/admin/m/*)이 데스크탑 사이드바를 건너뛰기 위한 용도.
 */
function passThroughWithPathname(req: NextRequest, pathname: string): NextResponse {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  let secret: string;
  try {
    secret = getSessionSecret();
  } catch {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "서버 설정 오류" }, { status: 500 });
    }
    return passThroughWithPathname(req, pathname);
  }

  // ── 어드민 경로 보호 ────────────────────────────────────────────────
  if (isAdminPath(pathname)) {
    if (pathname === ADMIN_LOGIN_PAGE) return passThroughWithPathname(req, pathname);
    if (ADMIN_API_WHITELIST.has(pathname)) return passThroughWithPathname(req, pathname);

    const isApi = pathname.startsWith("/api/");
    const token = req.cookies.get(ADMIN_COOKIE)?.value ?? "";
    const payload = token ? await verifySession(token, "admin", secret) : null;
    if (!payload) return unauthorized(req, "admin", isApi);
    return passThroughWithPathname(req, pathname);
  }

  // ── 파일럿 포털 경로 보호 ──────────────────────────────────────────
  if (isPilotPath(pathname)) {
    if (pathname === PILOT_LOGIN_PAGE) return passThroughWithPathname(req, pathname);
    if (PILOT_API_WHITELIST.has(pathname)) return passThroughWithPathname(req, pathname);

    const isApi = pathname.startsWith("/api/");
    const token = req.cookies.get(PILOT_COOKIE)?.value ?? "";
    const payload = token ? await verifySession(token, "pilot", secret) : null;
    if (!payload) return unauthorized(req, "pilot", isApi);
    return passThroughWithPathname(req, pathname);
  }

  return passThroughWithPathname(req, pathname);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/pilot/:path*",
    "/api/pilot/:path*",
  ],
};
