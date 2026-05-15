/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/tenant";

// slug 자동 생성 헬퍼
function toSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// GET /api/products → is_active 상품 목록 (sort_order 오름차순)
export async function GET() {
  try {
    const supabase  = createServerClient() as any;
    const tenantId  = await getTenantId();

    const { data, error } = await supabase
      .from("products")
      .select("id, slug, name, subtitle, price, duration_min, features, badge, is_featured, sort_order")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST /api/products → 상품 생성
export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();
    const body = await req.json();

    const { name, subtitle, price, duration_min, features, badge, is_featured, sort_order, is_active, slug } = body;

    if (!name || price === undefined) {
      return NextResponse.json({ error: "name과 price는 필수입니다." }, { status: 400 });
    }

    const insertPayload: Record<string, any> = {
      tenant_id: tenantId,
      name,
      slug: slug ?? toSlug(name),
      price,
      is_active: is_active ?? true,
    };
    if (subtitle !== undefined) insertPayload.subtitle = subtitle;
    if (duration_min !== undefined) insertPayload.duration_min = duration_min;
    if (features !== undefined) insertPayload.features = features;
    if (badge !== undefined) insertPayload.badge = badge;
    if (is_featured !== undefined) insertPayload.is_featured = is_featured;
    if (sort_order !== undefined) insertPayload.sort_order = sort_order;

    const { data, error } = await supabase
      .from("products")
      .insert(insertPayload)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// PATCH /api/products → 상품 수정
export async function PATCH(req: NextRequest) {
  try {
    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();
    const body = await req.json();

    const { id, ...fields } = body;
    if (!id) return NextResponse.json({ error: "id는 필수입니다." }, { status: 400 });

    const { data, error } = await supabase
      .from("products")
      .update(fields)
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

// DELETE /api/products → 상품 비활성화 (soft delete)
export async function DELETE(req: NextRequest) {
  try {
    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();
    const body = await req.json();

    const { id } = body;
    if (!id) return NextResponse.json({ error: "id는 필수입니다." }, { status: 400 });

    const { data, error } = await supabase
      .from("products")
      .update({ is_active: false })
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
