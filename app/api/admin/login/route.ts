import { NextRequest, NextResponse } from "next/server";

async function createSignedToken(secret: string): Promise<string> {
  const rand = crypto.getRandomValues(new Uint8Array(16));
  const randHex = Array.from(rand).map(b => b.toString(16).padStart(2, "0")).join("");

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(randHex));
  const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");

  return `${randHex}.${sigHex}`;
}

// POST /api/admin/login
export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    const correct = process.env.ADMIN_PASSWORD ?? "admin1234";
    const secret  = process.env.SESSION_SECRET  ?? "dev-secret-change-in-production";

    if (!password || password !== correct) {
      return NextResponse.json(
        { error: "비밀번호가 올바르지 않습니다." },
        { status: 401 }
      );
    }

    const token = await createSignedToken(secret);

    const res = NextResponse.json({ ok: true });
    res.cookies.set("gureum_admin_session", token, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24, // 24시간
      sameSite: "lax",
    });
    return res;
  } catch {
    return NextResponse.json({ error: "요청 오류" }, { status: 400 });
  }
}
