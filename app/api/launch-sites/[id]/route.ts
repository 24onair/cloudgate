/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/tenant";

// PATCH /api/launch-sites/:id
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();
    const { id } = await params;
    const body = await req.json();

    const update: Record<string, unknown> = {};
    if (body.name           !== undefined) update.name            = body.name;
    if (body.location       !== undefined) update.location        = body.location;
    if (body.nx             !== undefined) update.nx              = body.nx;
    if (body.ny             !== undefined) update.ny              = body.ny;
    if (body.lat            !== undefined) update.lat             = body.lat;
    if (body.lng            !== undefined) update.lng             = body.lng;
    if (body.altitude       !== undefined) update.altitude        = body.altitude;
    if (body.windDirections !== undefined) update.wind_directions = body.windDirections;
    if (body.active         !== undefined) update.active          = body.active;
    if (body.sortOrder      !== undefined) update.sort_order      = body.sortOrder;

    const { data, error } = await supabase
      .from("launch_sites")
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

// DELETE /api/launch-sites/:id
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();
    const { id } = await params;

    const { error } = await supabase
      .from("launch_sites")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
