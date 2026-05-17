/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/tenant";
import { requirePilot } from "@/lib/auth/session";

// GET /api/pilot/me  → 현재 세션 파일럿 정보
export async function GET(req: NextRequest) {
  const auth = await requirePilot(req);
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();

    const { data: pilot, error } = await supabase
      .from("pilots")
      .select("id, name, license_expiry, status, rate_per_flight")
      .eq("id", auth.payload.sub)
      .eq("tenant_id", tenantId)
      .single();

    if (error || !pilot) return NextResponse.json({ error: "파일럿 없음" }, { status: 404 });
    return NextResponse.json(pilot);
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
