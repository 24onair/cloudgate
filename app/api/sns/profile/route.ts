/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/tenant";

const KEY = "sns_profile";

// GET /api/sns/profile
export async function GET() {
  try {
    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();

    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("tenant_id", tenantId)
      .eq("key", KEY)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ value: data?.value ?? null });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// PATCH /api/sns/profile
// Body: { value: SnsProfile }
export async function PATCH(req: NextRequest) {
  try {
    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();
    const { value } = await req.json();

    const { error } = await supabase
      .from("site_settings")
      .upsert({ tenant_id: tenantId, key: KEY, value, updated_at: new Date().toISOString() });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
