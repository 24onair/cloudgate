import { NextResponse } from "next/server";
import { PILOT_COOKIE, clearCookieOptions } from "@/lib/auth/session";

// POST /api/pilot/logout
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(PILOT_COOKIE, "", clearCookieOptions());
  return res;
}
