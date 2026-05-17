import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  adminCookieOptions,
  getAdminPassword,
  getSessionSecret,
  signSession,
} from "@/lib/auth/session";

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

  let password: unknown;
  try {
    ({ password } = await req.json());
  } catch {
    return NextResponse.json({ error: "요청 오류" }, { status: 400 });
  }

  if (typeof password !== "string" || password !== correct) {
    return NextResponse.json(
      { error: "비밀번호가 올바르지 않습니다." },
      { status: 401 },
    );
  }

  const token = await signSession({ sub: "admin", role: "admin" }, secret);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, adminCookieOptions());
  return res;
}
