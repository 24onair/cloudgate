/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/tenant";

// ── GET /api/reviews ─────────────────────────────────────────────
// Query param: status=approved|pending|rejected (optional)
export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    let query = supabase
      .from("reviews")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// ── POST /api/reviews ────────────────────────────────────────────
// Body: { name, rating, product, body, images?, status? }
export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();
    const reqBody = await req.json();
    const { name, rating, product, body, images, status = "pending" } = reqBody;

    const { data, error } = await supabase
      .from("reviews")
      .insert({
        tenant_id: tenantId,
        name,
        rating,
        product: product ?? null,
        body,
        images: images ?? null,
        status,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
