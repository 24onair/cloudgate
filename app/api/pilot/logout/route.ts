import { NextResponse } from "next/server";

// POST /api/pilot/logout
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("gureum_pilot_session", "", {
    httpOnly: true,
    path:     "/",
    maxAge:   0,
  });
  return res;
}
