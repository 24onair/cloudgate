/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/tenant";

// PATCH /api/cost-categories/:id
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();
    const { id } = await params;
    const body = await req.json();

    const update: Record<string, unknown> = {};
    if (body.label     !== undefined) update.label      = body.label;
    if (body.color     !== undefined) update.color      = body.color;
    if (body.active    !== undefined) update.active     = body.active;
    if (body.sortOrder !== undefined) update.sort_order = body.sortOrder;

    const { data, error } = await supabase
      .from("cost_categories")
      .update(update)
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// DELETE /api/cost-categories/:id
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();
    const { id } = await params;

    const { error } = await supabase
      .from("cost_categories")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
