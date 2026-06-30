/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/tenant";

// 유튜브 채널에서 자동 수집한 쇼츠 목록을 서버에 영속화한다.
// (이전에는 관리자 브라우저의 세션 메모리에만 존재해 공개 랜딩페이지에 표시되지 않았음)
const KEY = "sns_fetched_shorts";

// GET /api/sns/fetched-shorts → { value: FetchedShort[] | null }
export async function GET() {
  try {
    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();

    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("tenant_id", tenantId)
      .eq("key", KEY)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ value: data?.value ?? null });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// PUT /api/sns/fetched-shorts
// Body: { value: FetchedShort[] }  — 전체 목록 덮어쓰기
export async function PUT(req: NextRequest) {
  try {
    const supabase = createServerClient() as any;
    const tenantId = await getTenantId();
    const { value } = await req.json();

    const { error } = await supabase
      .from("site_settings")
      .upsert({ tenant_id: tenantId, key: KEY, value, updated_at: new Date().toISOString() });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
