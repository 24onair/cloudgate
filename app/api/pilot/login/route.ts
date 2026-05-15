/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/tenant";

// pilot_id(UUID)를 hex 문자열로 인코딩
function pilotIdToHex(pilotId: string): string {
  return pilotId.replace(/-/g, "");
}

// hex → UUID 복원
export function hexToPilotId(hex: string): string {
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

// HMAC-SHA256 서명 토큰 생성: {pilotIdHex}.{hmac}
export async function createPilotToken(pilotId: string, secret: string): Promise<string> {
  const pilotIdHex = pilotIdToHex(pilotId);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(pilotIdHex));
  const sigHex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${pilotIdHex}.${sigHex}`;
}

// POST /api/pilot/login  { pilot_id, pin }
export async function POST(req: NextRequest) {
  try {
    const { pilot_id, pin } = await req.json();
    if (!pilot_id || !pin) {
      return NextResponse.json({ error: "pilot_id와 pin이 필요합니다." }, { status: 400 });
    }

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

    const secret = process.env.SESSION_SECRET ?? "dev-secret-change-in-production";
    const token  = await createPilotToken(pilot.id, secret);

    const res = NextResponse.json({ ok: true, pilot_id: pilot.id, name: pilot.name });
    res.cookies.set("gureum_pilot_session", token, {
      httpOnly: true,
      path:     "/",
      maxAge:   60 * 60 * 24 * 7, // 7일
      sameSite: "lax",
    });
    return res;
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
