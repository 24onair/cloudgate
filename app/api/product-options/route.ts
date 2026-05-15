/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/tenant";

// GET /api/product-options
// ?product_id=UUID  → 특정 상품 옵션만
// (없으면) 테넌트 전체 활성 옵션
export async function GET(req: NextRequest) {
  try {
    const supabase  = createServerClient() as any;
    const tenantId  = await getTenantId();
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("product_id");

    let query = supabase
      .from("product_options")
      .select("id, product_id, name, price")
      .eq("tenant_id", tenantId)
      .eq("is_active", true);

    if (productId) query = query.eq("product_id", productId);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST /api/product-options → 옵션 생성
export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();
    const body = await req.json();

    const { product_id, name, price, is_active } = body;
    if (!product_id || !name || price === undefined) {
      return NextResponse.json({ error: "product_id, name, price는 필수입니다." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("product_options")
      .insert({
        tenant_id: tenantId,
        product_id,
        name,
        price,
        is_active: is_active ?? true,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// PATCH /api/product-options → 옵션 수정
export async function PATCH(req: NextRequest) {
  try {
    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();
    const body = await req.json();

    const { id, ...fields } = body;
    if (!id) return NextResponse.json({ error: "id는 필수입니다." }, { status: 400 });

    const { data, error } = await supabase
      .from("product_options")
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

// DELETE /api/product-options → 옵션 삭제 (hard delete)
export async function DELETE(req: NextRequest) {
  try {
    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();
    const body = await req.json();

    const { id } = body;
    if (!id) return NextResponse.json({ error: "id는 필수입니다." }, { status: 400 });

    const { error } = await supabase
      .from("product_options")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenantId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
