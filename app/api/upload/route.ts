/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  ADMIN_COOKIE,
  getSessionSecret,
  verifySession,
} from "@/lib/auth/session";
import {
  checkRateLimit,
  clientIp,
  registerFailure,
  type RateLimitPolicy,
} from "@/lib/auth/rateLimit";

// POST /api/upload
// multipart/form-data: file 필드 (+ folder)
// 반환: { url: string }
//
// 보안 가드:
//  - 이미지 MIME 화이트리스트 (확장자는 MIME에서 유도 — 파일명 불신)
//  - 용량 제한: 익명 5MB / 관리자 10MB
//  - 익명(손님 후기)은 folder=reviews 로 강제 + IP당 20회/10분 rate limit
//  - 그 외 폴더(products/logo/backgrounds/pilots/receipts)는 관리자 세션 필수

const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/avif": "avif",
};

const ANON_MAX_BYTES = 5 * 1024 * 1024;   // 5MB
const ADMIN_MAX_BYTES = 10 * 1024 * 1024; // 10MB
const ANON_FOLDER = "reviews";

// 익명 업로드 남용 방지 — IP당 20회/10분 (후기 1건당 사진 3장 기준 충분)
const ANON_UPLOAD_POLICY: RateLimitPolicy = { max: 20, windowMs: 10 * 60 * 1000 };

async function isAdmin(req: NextRequest): Promise<boolean> {
  try {
    const token = req.cookies.get(ADMIN_COOKIE)?.value ?? "";
    if (!token) return false;
    return !!(await verifySession(token, "admin", getSessionSecret()));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await isAdmin(req);

    // 익명 rate limit (관리자는 면제)
    if (!admin) {
      const rlKey = `upload:${clientIp(req)}`;
      const rl = checkRateLimit(rlKey, ANON_UPLOAD_POLICY);
      if (rl.limited) {
        return NextResponse.json(
          { error: `업로드가 너무 많습니다. ${rl.retryAfterSec}초 후 다시 시도하세요.` },
          { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
        );
      }
      registerFailure(rlKey, ANON_UPLOAD_POLICY); // 시도 1건 기록
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "파일이 없습니다" }, { status: 400 });

    // MIME 화이트리스트 — 확장자는 MIME에서 유도한다 (파일명 위조 방지)
    const ext = ALLOWED_MIME[file.type];
    if (!ext) {
      return NextResponse.json({ error: "이미지 파일만 업로드할 수 있습니다" }, { status: 415 });
    }

    // 용량 제한
    const maxBytes = admin ? ADMIN_MAX_BYTES : ANON_MAX_BYTES;
    if (file.size > maxBytes) {
      return NextResponse.json(
        { error: `파일이 너무 큽니다 (최대 ${Math.floor(maxBytes / 1024 / 1024)}MB)` },
        { status: 413 },
      );
    }

    // 폴더: 익명은 reviews 강제, 관리자는 영문/숫자만 허용
    const requested = (formData.get("folder") as string) || "misc";
    const folder = admin
      ? (/^[a-z0-9_-]{1,32}$/i.test(requested) ? requested : "misc")
      : ANON_FOLDER;

    const supabase = createServerClient() as any;
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error } = await supabase.storage
      .from("images")
      .upload(path, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: { publicUrl } } = supabase.storage.from("images").getPublicUrl(path);
    return NextResponse.json({ url: publicUrl });
  } catch (e: unknown) {
    console.error("[upload]", e);
    return NextResponse.json({ error: "업로드 처리 중 오류가 발생했습니다" }, { status: 500 });
  }
}
