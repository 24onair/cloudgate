import { createServerClient } from "./server";

let cachedTenantId: string | null = null;

/** gureum 테넌트 ID를 반환 (모듈 레벨 캐시) */
export async function getTenantId(slug = "gureum"): Promise<string> {
  if (cachedTenantId) return cachedTenantId;
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", slug)
    .single();
  if (error || !data) throw new Error(`Tenant not found: ${slug} (${error?.message})`);
  cachedTenantId = data.id;
  return cachedTenantId;
}
