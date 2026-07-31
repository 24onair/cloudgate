/* eslint-disable @typescript-eslint/no-explicit-any */
// 광고 랜딩(서버 컴포넌트) 전용 데이터 조회.
// service_role 클라이언트를 사용하므로 서버에서만 import 할 것.
import { createServerClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/tenant";

export interface LandingProduct {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  price: number;
  duration_min: number | null;
  badge: string | null;
  is_featured: boolean;
}

export interface LandingReview {
  id: string;
  name: string;
  rating: number;
  product: string | null;
  body: string;
}

// 조회 실패 시 빈 배열 — 랜딩은 가격/후기 섹션만 생략하고 나머지를 렌더한다.
export async function getActiveProducts(): Promise<LandingProduct[]> {
  try {
    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();
    const { data, error } = await supabase
      .from("products")
      .select("id, slug, name, subtitle, price, duration_min, badge, is_featured")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getApprovedReviews(limit = 3): Promise<LandingReview[]> {
  try {
    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();
    const { data, error } = await supabase
      .from("reviews")
      .select("id, name, rating, product, body")
      .eq("tenant_id", tenantId)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}
