/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/tenant";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id }     = await ctx.params;
    const supabase   = createServerClient() as any;
    const tenantId   = await getTenantId();
    const body       = await req.json();

    const { data, error } = await supabase
      .from("pilots")
      .update({ ...body, updated_at: new Date().toISOString() })
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

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const { id }     = await ctx.params;
    const supabase   = createServerClient() as any;
    const tenantId   = await getTenantId();
    const { searchParams } = new URL(req.url);
    const hard = searchParams.get("hard") === "1";

    if (hard) {
      // 연결된 예약의 pilot_id를 null로 해제 후 완전 삭제
      await supabase
        .from("bookings")
        .update({ pilot_id: null })
        .eq("pilot_id", id)
        .eq("tenant_id", tenantId);

      const { error } = await supabase
        .from("pilots")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      // soft delete — 비행기록·정산 이력 보존
      const { error } = await supabase
        .from("pilots")
        .update({ status: "inactive" })
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
