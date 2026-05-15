/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/tenant";

// ── PATCH /api/reviews/[id] ──────────────────────────────────────
// Body: { status?, name?, rating?, body? }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();
    const body = await req.json();
    const { status, name, rating, body: reviewBody } = body;

    const updates: Record<string, any> = {};
    if (status !== undefined) updates.status = status;
    if (name !== undefined) updates.name = name;
    if (rating !== undefined) updates.rating = rating;
    if (reviewBody !== undefined) updates.body = reviewBody;

    const { data, error } = await supabase
      .from("reviews")
      .update(updates)
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// ── DELETE /api/reviews/[id] ─────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();

    const { error } = await supabase
      .from("reviews")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenantId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
