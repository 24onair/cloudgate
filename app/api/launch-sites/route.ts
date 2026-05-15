/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/tenant";

// GET /api/launch-sites
export async function GET() {
  try {
    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();

    const { data, error } = await supabase
      .from("launch_sites")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("sort_order", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST /api/launch-sites
export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();
    const body = await req.json();

    const { data, error } = await supabase
      .from("launch_sites")
      .insert({
        id:              body.id,
        tenant_id:       tenantId,
        name:            body.name,
        location:        body.location ?? "",
        nx:              body.nx ?? 0,
        ny:              body.ny ?? 0,
        lat:             body.lat ?? null,
        lng:             body.lng ?? null,
        altitude:        body.altitude ?? 0,
        wind_directions: body.windDirections ?? {},
        active:          body.active ?? true,
        sort_order:      body.sortOrder ?? 0,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
