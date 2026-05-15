/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/tenant";

// GET /api/sns/posts
export async function GET() {
  try {
    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();

    const { data, error } = await supabase
      .from("sns_posts")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("sort_order", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST /api/sns/posts
// Body: { imageUrl, caption, link, sortOrder }
export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();
    const body = await req.json();

    const { data, error } = await supabase
      .from("sns_posts")
      .insert({
        tenant_id:  tenantId,
        image_url:  body.imageUrl ?? "",
        caption:    body.caption ?? "",
        link:       body.link ?? "",
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
