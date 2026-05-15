/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/tenant";

// GET /api/sns/shorts
export async function GET() {
  try {
    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();

    const { data, error } = await supabase
      .from("sns_shorts")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("sort_order", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST /api/sns/shorts
// Body: { videoId, title, sortOrder }
export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();
    const body = await req.json();

    const { data, error } = await supabase
      .from("sns_shorts")
      .insert({
        tenant_id:  tenantId,
        video_id:   body.videoId,
        title:      body.title ?? "",
        sort_order: body.sortOrder ?? 0,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
