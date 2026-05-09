/**
 * 상품 초기 데이터 시드 스크립트
 * 실행: npx tsx scripts/seed-products.ts
 */
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// .env.local 수동 파싱 (dotenv 의존성 없이)
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
  { auth: { persistSession: false } }
);

async function main() {
  // 테넌트 ID 조회
  const { data: tenant, error: tErr } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", "gureum")
    .single();

  if (tErr || !tenant) {
    console.error("테넌트를 찾을 수 없습니다:", tErr?.message);
    process.exit(1);
  }
  const tenantId = tenant.id;
  console.log("테넌트 ID:", tenantId);

  // ── 상품 upsert ──
  const productsData = [
    {
      tenant_id: tenantId,
      slug: "basic",
      name: "베이직",
      subtitle: "첫 패러글라이딩 입문",
      price: 75000,
      duration_min: 10,
      features: ["탠덤 비행", "안전 교육", "기념 스티커"],
      badge: null,
      is_featured: false,
      is_active: true,
      sort_order: 1,
    },
    {
      tenant_id: tenantId,
      slug: "extreme",
      name: "익스트림",
      subtitle: "스릴 넘치는 고고도 비행",
      price: 120000,
      duration_min: 20,
      features: ["고고도 탠덤 비행", "스릴 기동", "안전 교육"],
      badge: "인기",
      is_featured: true,
      is_active: true,
      sort_order: 2,
    },
    {
      tenant_id: tenantId,
      slug: "vip",
      name: "VIP",
      subtitle: "프리미엄 풀 패키지",
      price: 180000,
      duration_min: 30,
      features: ["파노라마 코스", "VIP 라운지", "사진+영상 포함"],
      badge: null,
      is_featured: false,
      is_active: true,
      sort_order: 3,
    },
  ];

  const { data: insertedProducts, error: pErr } = await supabase
    .from("products")
    .upsert(productsData, { onConflict: "tenant_id,slug" })
    .select("id, slug, name");

  if (pErr) {
    console.error("상품 upsert 실패:", pErr.message);
    process.exit(1);
  }
  console.log("상품 등록 완료:", insertedProducts?.map((p: { slug: string; name: string }) => p.slug).join(", "));

  // ── 상품 옵션 upsert ──
  const productMap = Object.fromEntries(
    (insertedProducts ?? []).map((p: { id: string; slug: string }) => [p.slug, p.id])
  );

  const optionsData = [
    // basic 옵션
    { tenant_id: tenantId, product_id: productMap["basic"], name: "사진 패키지", price: 30000, is_active: true },
    { tenant_id: tenantId, product_id: productMap["basic"], name: "영상 촬영",   price: 20000, is_active: true },
    // extreme 옵션
    { tenant_id: tenantId, product_id: productMap["extreme"], name: "사진 패키지", price: 30000, is_active: true },
    { tenant_id: tenantId, product_id: productMap["extreme"], name: "영상 촬영",   price: 20000, is_active: true },
    // vip: 사진+영상 포함이므로 별도 옵션 없음
  ].filter((o) => o.product_id); // product_id 없으면 skip

  if (optionsData.length > 0) {
    // 기존 옵션 삭제 후 재삽입 (간단한 시드이므로)
    const productIds = [...new Set(optionsData.map((o) => o.product_id))];
    await supabase.from("product_options").delete().in("product_id", productIds);

    const { error: oErr } = await supabase.from("product_options").insert(optionsData);
    if (oErr) {
      console.error("옵션 insert 실패:", oErr.message);
      process.exit(1);
    }
    console.log("옵션 등록 완료:", optionsData.length, "건");
  }

  console.log("✅ 시드 완료");
}

main();
