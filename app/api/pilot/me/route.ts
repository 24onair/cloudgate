/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/tenant";

// 토큰에서 pilot_id 추출 + 서명 검증
async function verifyPilotToken(token: string, secret: string): Promise<string | null> {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [pilotIdHex, sigHex] = parts;
  if (pilotIdHex.length !== 32) return null;

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(pilotIdHex));
    const expected = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0")).join("");
    if (expected !== sigHex) return null;

    // hex → UUID
    return `${pilotIdHex.slice(0,8)}-${pilotIdHex.slice(8,12)}-${pilotIdHex.slice(12,16)}-${pilotIdHex.slice(16,20)}-${pilotIdHex.slice(20)}`;
  } catch {
    return null;
  }
}

// GET /api/pilot/me  → 현재 세션 파일럿 정보
export async function GET(req: NextRequest) {
  try {
    const token  = req.cookies.get("gureum_pilot_session")?.value;
    if (!token) return NextResponse.json({ error: "미인증" }, { status: 401 });

    const secret  = process.env.SESSION_SECRET ?? "dev-secret-change-in-production";
    const pilotId = await verifyPilotToken(token, secret);
    if (!pilotId) return NextResponse.json({ error: "세션 만료" }, { status: 401 });

    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();

    const { data: pilot, error } = await supabase
      .from("pilots")
      .select("id, name, license_expiry, total_flights, status, rate_per_flight")
      .eq("id", pilotId)
      .eq("tenant_id", tenantId)
      .single();

    if (error || !pilot) return NextResponse.json({ error: "파일럿 없음" }, { status: 404 });
    return NextResponse.json(pilot);
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
