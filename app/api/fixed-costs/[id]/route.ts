/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/tenant";

// PATCH /api/fixed-costs/:id
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();
    const { id } = await params;
    const body = await req.json();

    const update: Record<string, unknown> = {};
    if (body.name         !== undefined) update.name          = body.name;
    if (body.category     !== undefined) update.category      = body.category;
    if (body.amount       !== undefined) update.amount        = body.amount;
    if (body.billingCycle !== undefined) update.billing_cycle = body.billingCycle;
    if (body.memo         !== undefined) update.memo          = body.memo;
    if (body.active       !== undefined) update.active        = body.active;

    const { data, error } = await supabase
      .from("fixed_costs")
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

// DELETE /api/fixed-costs/:id
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();
    const { id } = await params;

    const { error } = await supabase
      .from("fixed_costs")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
