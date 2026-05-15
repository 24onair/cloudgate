import { NextRequest, NextResponse } from "next/server";

// ── 공통 HMAC 검증 ─────────────────────────────────────────────────
async function verifyToken(token: string, secret: string): Promise<boolean> {
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payload, sigHex] = parts;

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
    const expectedHex = Array.from(new Uint8Array(sig))
      .map(b => b.toString(16).padStart(2, "0")).join("");

    return expectedHex === sigHex;
  } catch {
    return false;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const secret = process.env.SESSION_SECRET ?? "dev-secret-change-in-production";

  // ── 어드민 경로 보호 ──────────────────────────────────────────────
  if (pathname === "/admin/login") return NextResponse.next();
  if (pathname.startsWith("/admin")) {
    const session = req.cookies.get("gureum_admin_session");
    if (!session?.value || !(await verifyToken(session.value, secret))) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }

  // ── 파일럿 포털 경로 보호 ─────────────────────────────────────────
  if (pathname === "/pilot/login") return NextResponse.next();
  if (pathname.startsWith("/pilot")) {
    const session = req.cookies.get("gureum_pilot_session");
    if (!session?.value || !(await verifyToken(session.value, secret))) {
      return NextResponse.redirect(new URL("/pilot/login", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/pilot/:path*"],
};
