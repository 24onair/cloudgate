/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/tenant";

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
