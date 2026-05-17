import { NextResponse } from "next/server";
import { ADMIN_COOKIE, clearCookieOptions } from "@/lib/auth/session";

// POST /api/admin/logout
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", clearCookieOptions());
  return res;
}
