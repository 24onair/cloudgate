/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/tenant";
import {
  PILOT_COOKIE,
  getSessionSecret,
  pilotCookieOptions,
  signSession,
} from "@/lib/auth/session";

// POST /api/pilot/login  { pilot_id, pin }
export async function POST(req: NextRequest) {
  let secret: string;
  try {
    secret = getSessionSecret();
  } catch (e) {
    console.error("[pilot/login] env misconfigured:", e);
    return NextResponse.json({ error: "서버 설정 오류" }, { status: 500 });
  }

  let pilot_id: unknown;
  let pin: unknown;
  try {
    ({ pilot_id, pin } = await req.json());
  } catch {
    return NextResponse.json({ error: "요청 오류" }, { status: 400 });
  }

  if (typeof pilot_id !== "string" || typeof pin !== "string") {
    return NextResponse.json({ error: "pilot_id와 pin이 필요합니다." }, { status: 400 });
  }

  try {
    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();

    const { data: pilot, error } = await supabase
      .from("pilots")
      .select("id, name, pin, status")
      .eq("id", pilot_id)
      .eq("tenant_id", tenantId)
      .single();

    if (error || !pilot) {
      return NextResponse.json({ error: "파일럿을 찾을 수 없습니다." }, { status: 404 });
    }
    if (pilot.status !== "active") {
      return NextResponse.json({ error: "비활성 파일럿입니다." }, { status: 403 });
    }

    const storedPin = pilot.pin ?? "0000";
    if (pin !== storedPin) {
      return NextResponse.json({ error: "PIN이 올바르지 않습니다." }, { status: 401 });
    }

    const token = await signSession({ sub: pilot.id, role: "pilot" }, secret);

    const res = NextResponse.json({ ok: true, pilot_id: pilot.id, name: pilot.name });
    res.cookies.set(PILOT_COOKIE, token, pilotCookieOptions());
    return res;
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
