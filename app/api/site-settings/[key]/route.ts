/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/tenant";

// ── GET /api/site-settings/[key] ────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();

    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("tenant_id", tenantId)
      .eq("key", key)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data?.value ?? {});
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// ── PATCH /api/site-settings/[key] ──────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();
    const body = await req.json();
    const value = body.value ?? body;

    const { data, error } = await supabase
      .from("site_settings")
      .upsert(
        { tenant_id: tenantId, key, value, updated_at: new Date().toISOString() },
        { onConflict: "tenant_id,key" }
      )
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
