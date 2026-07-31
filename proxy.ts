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

// ─────────────────────────────────────────────────────────────────────
// 공개 API 화이트리스트 (로그인 없이 손님 사이트가 호출하는 경로)
//
// 설계 원칙: 일반 `/api/*` 는 **기본 차단(default-deny → 관리자 전용)**.
// 손님 랜딩/예약/후기 페이지가 실제로 호출하는 경로만 여기에 method 단위로 허용한다.
// 같은 라우트라도 GET 은 공개, mutation(POST/PATCH/DELETE)은 관리자 전용인 경우가 많아
// path + method 를 함께 본다.
//
// ⚠️ 후속 보강(BACKLOG): /api/reviews GET 은 미인증 시 status=approved 로 강제(미승인 후기 노출 방지).
//    (/api/upload 는 라우트 자체에서 MIME·용량·rate limit·폴더 강제 가드 적용됨)
// ─────────────────────────────────────────────────────────────────────
type PublicRule = { re: RegExp; methods: Set<string> };
const GET = new Set(["GET"]);
const POST = new Set(["POST"]);

const PUBLIC_API: PublicRule[] = [
  // 손님 랜딩/예약 읽기 ────────────────────────────────────
  { re: /^\/api\/products$/, methods: GET },
  { re: /^\/api\/product-options$/, methods: GET },
  { re: /^\/api\/weather$/, methods: GET },
  { re: /^\/api\/bookings\/day-capacity$/, methods: GET },
  { re: /^\/api\/faqs$/, methods: GET },
  { re: /^\/api\/launch-sites$/, methods: GET },
  { re: /^\/api\/site-settings(\/.*)?$/, methods: GET },
  { re: /^\/api\/sns\/(posts|profile|shorts|fetched-shorts)$/, methods: GET },
  { re: /^\/api\/youtube\/feed$/, methods: GET },
  { re: /^\/api\/schedules$/, methods: GET },
  { re: /^\/api\/blocked-slots$/, methods: GET },
  { re: /^\/api\/pilots$/, methods: GET }, // 파일럿 로그인 화면의 선택 목록
  // 손님 쓰기(로그인 없이 허용) ──────────────────────────────
  { re: /^\/api\/bookings$/, methods: POST }, // 예약 생성
  { re: /^\/api\/reviews$/, methods: new Set(["GET", "POST"]) }, // 후기 조회/작성
  { re: /^\/api\/upload$/, methods: POST }, // 후기 사진 업로드 (라우트 내 MIME·용량·rate limit 가드)
];

function isPublicApi(pathname: string, method: string): boolean {
  for (const rule of PUBLIC_API) {
    if (rule.re.test(pathname) && rule.methods.has(method)) return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────
// 파일럿 세션으로도 접근 가능한 일반 API (관리자도 당연히 가능).
// 파일럿 포털이 쓰는 경로만 명시. 그 외 일반 /api 는 관리자 전용 유지.
//   - GET  /api/bookings            : 금일 전체 스케줄 조회
//   - PATCH /api/bookings/:id        : 비행시작·착륙완료 상태 변경
//   - GET/POST /api/flight_records   : 내 비행기록 조회 / 착륙 기록 생성
//   - POST /api/schedules            : 본인 근무(출근·휴무) 토글
// ─────────────────────────────────────────────────────────────────────
const PILOT_ALLOWED_API: PublicRule[] = [
  { re: /^\/api\/bookings$/, methods: GET },
  { re: /^\/api\/bookings\/[^/]+$/, methods: new Set(["PATCH"]) },
  { re: /^\/api\/flight_records$/, methods: new Set(["GET", "POST"]) },
  { re: /^\/api\/schedules$/, methods: POST },
];

function isPilotAllowedApi(pathname: string, method: string): boolean {
  for (const rule of PILOT_ALLOWED_API) {
    if (rule.re.test(pathname) && rule.methods.has(method)) return true;
  }
  return false;
}

function isAdminPath(p: string) {
  return p === "/admin" || p.startsWith("/admin/") || p.startsWith("/api/admin/") || p === "/api/admin";
}

function isPilotPath(p: string) {
  return p === "/pilot" || p.startsWith("/pilot/") || p.startsWith("/api/pilot/") || p === "/api/pilot";
}

function unauthorized(
  req: NextRequest,
  scope: "admin" | "pilot",
  isApi: boolean,
  originalPath?: string,
): NextResponse {
  if (isApi) {
    const res = NextResponse.json({ error: "미인증" }, { status: 401 });
    res.cookies.set(scope === "admin" ? ADMIN_COOKIE : PILOT_COOKIE, "", clearCookieOptions());
    return res;
  }
  const loginUrl = new URL(scope === "admin" ? ADMIN_LOGIN_PAGE : PILOT_LOGIN_PAGE, req.url);
  // 로그인 후 원래 가려던 경로로 돌려보내기 위한 next 쿼리 보존.
  // (예: 모바일에서 /admin/m 진입 시 로그인 후 다시 /admin/m으로 복귀)
  // 같은 로그인 페이지를 next로 넣으면 무한 루프이므로 제외.
  if (
    originalPath &&
    originalPath !== ADMIN_LOGIN_PAGE &&
    originalPath !== PILOT_LOGIN_PAGE
  ) {
    loginUrl.searchParams.set("next", originalPath);
  }
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
  const method = req.method;

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
    if (!payload) return unauthorized(req, "admin", isApi, pathname);
    return passThroughWithPathname(req, pathname);
  }

  // ── 파일럿 포털 경로 보호 ──────────────────────────────────────────
  if (isPilotPath(pathname)) {
    if (pathname === PILOT_LOGIN_PAGE) return passThroughWithPathname(req, pathname);
    if (PILOT_API_WHITELIST.has(pathname)) return passThroughWithPathname(req, pathname);

    const isApi = pathname.startsWith("/api/");
    const token = req.cookies.get(PILOT_COOKIE)?.value ?? "";
    const payload = token ? await verifySession(token, "pilot", secret) : null;
    if (!payload) return unauthorized(req, "pilot", isApi, pathname);
    return passThroughWithPathname(req, pathname);
  }

  // ── 일반 API 보호 (기본 차단 → 관리자 전용) ─────────────────────────
  // /api/admin, /api/pilot 이외의 모든 API. 공개 화이트리스트에 없으면
  // 관리자 세션을 요구한다. (매출·정산·고객 PII·각종 mutation 차단)
  if (pathname.startsWith("/api/")) {
    if (isPublicApi(pathname, method)) {
      return passThroughWithPathname(req, pathname);
    }
    // 관리자 세션이면 전부 허용
    const adminToken = req.cookies.get(ADMIN_COOKIE)?.value ?? "";
    if (adminToken && (await verifySession(adminToken, "admin", secret))) {
      return passThroughWithPathname(req, pathname);
    }
    // 파일럿 포털이 쓰는 일부 경로는 파일럿 세션도 허용
    if (isPilotAllowedApi(pathname, method)) {
      const pilotToken = req.cookies.get(PILOT_COOKIE)?.value ?? "";
      if (pilotToken && (await verifySession(pilotToken, "pilot", secret))) {
        return passThroughWithPathname(req, pathname);
      }
    }
    return unauthorized(req, "admin", true, pathname);
  }

  return passThroughWithPathname(req, pathname);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/pilot/:path*",
    "/api/:path*",
  ],
};
