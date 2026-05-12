/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerClient } from "./server";

let cachedTenantId: string | null = null;

/** gureum 테넌트 ID를 반환
 *  TENANT_ID 환경변수가 있으면 DB 조회 없이 즉시 반환 (콜드스타트 최적화)
 */
export async function getTenantId(slug = "gureum"): Promise<string> {
  if (cachedTenantId) return cachedTenantId;

  // 환경변수로 미리 설정된 경우 DB 쿼리 생략
  const envId = process.env.TENANT_ID;
  if (envId) {
    cachedTenantId = envId;
    return envId;
  }

  const supabase = createServerClient() as any;
  const { data, error } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", slug)
    .single();
  if (error || !data) throw new Error(`Tenant not found: ${slug} (${error?.message})`);
  cachedTenantId = (data as any).id as string;
  return cachedTenantId;
}
