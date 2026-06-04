/**
 * 더미 예약 일괄 삭제 — memo 에 [SEED-DUMMY] 태그가 붙은 예약과 그 배정을 제거.
 * 실행: npx tsx scripts/clean-dummy.ts
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

const TAG = "[SEED-DUMMY]";

async function main() {
  const { data: tenant } = await supabase.from("tenants").select("id").eq("slug", "gureum").single();
  if (!tenant) { console.error("테넌트 없음"); process.exit(1); }

  const { data: dummies } = await supabase
    .from("bookings").select("id").eq("tenant_id", tenant.id).ilike("memo", `%${TAG}%`);
  if (!dummies?.length) { console.log("삭제할 더미 없음"); return; }

  const ids = dummies.map((b) => b.id);
  await supabase.from("flight_records").delete().in("booking_id", ids);
  await supabase.from("booking_pilots").delete().in("booking_id", ids);
  await supabase.from("bookings").delete().in("id", ids);
  // 혹시 남은 태그 비행기록도 정리
  await supabase.from("flight_records").delete().ilike("memo", `%${TAG}%`);
  console.log(`더미 예약 ${ids.length}건 + 관련 배정·비행기록 삭제 완료`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
