/**
 * 읽기 전용 진단: 테넌트/파일럿/상품/예약 현황 확인 (쓰기 없음)
 * 실행: npx tsx scripts/probe.ts
 */
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf-8").split("\n").forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  });
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

async function main() {
  const { data: tenants } = await supabase.from("tenants").select("id, slug, name");
  console.log("=== 테넌트 ===");
  console.table(tenants ?? []);

  const tenantId = tenants?.[0]?.id;
  if (!tenantId) { console.error("테넌트 없음"); process.exit(1); }

  const { data: pilots } = await supabase
    .from("pilots")
    .select("id, name, status, rotation_order")
    .eq("tenant_id", tenantId)
    .order("rotation_order", { ascending: true });
  console.log("\n=== 파일럿 ===");
  console.table((pilots ?? []).map((p) => ({ name: p.name, status: p.status, rot: p.rotation_order, id: p.id.slice(0, 8) })));

  const { data: products } = await supabase
    .from("products")
    .select("id, name, price, is_active")
    .eq("tenant_id", tenantId)
    .order("sort_order", { ascending: true });
  console.log("\n=== 상품 ===");
  console.table((products ?? []).map((p) => ({ name: p.name, price: p.price, active: p.is_active, id: p.id.slice(0, 8) })));

  const { count: bkCount } = await supabase
    .from("bookings").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId);
  console.log("\n=== 기존 예약 총건수:", bkCount);

  // 상태별 분포
  const { data: byStatus } = await supabase
    .from("bookings").select("status").eq("tenant_id", tenantId);
  const dist: Record<string, number> = {};
  for (const b of byStatus ?? []) dist[b.status] = (dist[b.status] ?? 0) + 1;
  console.log("상태별 분포:", dist);

  // 분배율 설정
  const { data: cfg } = await supabase
    .from("site_settings").select("value").eq("key", "settlement_config").maybeSingle();
  console.log("정산 기본 분배율(defaultPilotShare):", cfg?.value?.defaultPilotShare ?? "(미설정 → 기본 60)");

  // 예약 컬럼 확인용 샘플 1건
  const { data: sample } = await supabase
    .from("bookings").select("*").eq("tenant_id", tenantId).limit(1);
  console.log("\n=== bookings 컬럼(샘플 기준) ===");
  console.log(sample?.[0] ? Object.keys(sample[0]).join(", ") : "(예약 0건 — 컬럼 확인 불가)");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
