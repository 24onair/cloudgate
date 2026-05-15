/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// POST /api/upload
// multipart/form-data: file 필드
// 반환: { url: string }

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "파일이 없습니다" }, { status: 400 });

    const supabase = createServerClient() as any;

    // 경로: {폴더}/{타임스탬프}-{랜덤}.{확장자}
    const folder = (formData.get("folder") as string) || "misc";
    const ext    = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path   = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error } = await supabase.storage
      .from("images")
      .upload(path, arrayBuffer, {
        contentType: file.type || "image/jpeg",
        upsert: false,
      });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: { publicUrl } } = supabase.storage.from("images").getPublicUrl(path);
    return NextResponse.json({ url: publicUrl });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
