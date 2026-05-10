import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  const url     = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const svcKey  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  // DB 연결 테스트
  let dbResult = "";
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerClient() as any;
    const { data, error } = await supabase.from("tenants").select("id,slug");
    dbResult = error ? `ERROR: ${error.message}` : `OK: ${JSON.stringify(data)}`;
  } catch (e) {
    dbResult = `THROW: ${String(e)}`;
  }

  return NextResponse.json({
    supabaseUrl:      url  ? url.slice(0, 40) + "…"  : "MISSING",
    serviceKeyPrefix: svcKey  ? svcKey.slice(0, 20) + "…"  : "MISSING",
    serviceKeyLen:    svcKey.length,
    anonKeyPrefix:    anonKey ? anonKey.slice(0, 20) + "…" : "MISSING",
    dbResult,
  });
}
