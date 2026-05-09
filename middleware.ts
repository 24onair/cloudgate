import { NextRequest, NextResponse } from "next/server";

async function verifyToken(token: string, secret: string): Promise<boolean> {
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [randHex, sigHex] = parts;

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(randHex));
    const expectedHex = Array.from(new Uint8Array(sig))
      .map(b => b.toString(16).padStart(2, "0")).join("");

    return expectedHex === sigHex;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/admin/login") return NextResponse.next();

  if (pathname.startsWith("/admin")) {
    const session = req.cookies.get("gureum_admin_session");
    const secret  = process.env.SESSION_SECRET ?? "dev-secret-change-in-production";

    if (!session?.value || !(await verifyToken(session.value, secret))) {
      const loginUrl = new URL("/admin/login", req.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
