import { NextRequest, NextResponse } from "next/server";

export type SessionRole = "admin" | "pilot";

export type SessionPayload = {
  sub: string;
  role: SessionRole;
  iat: number;
  exp: number;
};

export const ADMIN_COOKIE = "gureum_admin_session";
export const PILOT_COOKIE = "gureum_pilot_session";

const ADMIN_TTL_SECONDS = 60 * 60 * 24;       // 24h
const PILOT_TTL_SECONDS = 60 * 60 * 24 * 7;   // 7d

const enc = new TextEncoder();

export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET is not configured (or is shorter than 32 chars). " +
      "Generate one with `openssl rand -hex 32` and set it in .env.local."
    );
  }
  return secret;
}

export function getAdminPassword(): string {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) {
    throw new Error("ADMIN_PASSWORD is not configured. Set it in .env.local.");
  }
  return pw;
}

function base64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(s: string): Uint8Array<ArrayBuffer> {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const buf = new ArrayBuffer(bin.length);
  const out = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signSession(
  input: { sub: string; role: SessionRole; ttlSeconds?: number },
  secret: string = getSessionSecret(),
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const ttl = input.ttlSeconds ?? (input.role === "admin" ? ADMIN_TTL_SECONDS : PILOT_TTL_SECONDS);
  const payload: SessionPayload = {
    sub: input.sub,
    role: input.role,
    iat: now,
    exp: now + ttl,
  };
  const payloadB64 = base64urlEncode(enc.encode(JSON.stringify(payload)));
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payloadB64));
  const sigB64 = base64urlEncode(new Uint8Array(sig));
  return `${payloadB64}.${sigB64}`;
}

export async function verifySession(
  token: string,
  expectedRole: SessionRole,
  secret: string = getSessionSecret(),
): Promise<SessionPayload | null> {
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot <= 0 || dot === token.length - 1) return null;
  const payloadB64 = token.slice(0, dot);
  const sigB64 = token.slice(dot + 1);

  let sig: Uint8Array<ArrayBuffer>;
  try {
    sig = base64urlDecode(sigB64);
  } catch {
    return null;
  }

  let key: CryptoKey;
  try {
    key = await hmacKey(secret);
  } catch {
    return null;
  }

  const ok = await crypto.subtle.verify("HMAC", key, sig, enc.encode(payloadB64));
  if (!ok) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(base64urlDecode(payloadB64))) as SessionPayload;
  } catch {
    return null;
  }

  if (typeof payload.sub !== "string" || typeof payload.iat !== "number" || typeof payload.exp !== "number") {
    return null;
  }
  if (payload.role !== expectedRole) return null;

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp <= now) return null;

  return payload;
}

type CookieOptions = {
  httpOnly: true;
  path: "/";
  maxAge: number;
  sameSite: "lax";
  secure: boolean;
};

export function sessionCookieOptions(maxAge: number): CookieOptions {
  return {
    httpOnly: true,
    path: "/",
    maxAge,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  };
}

export function adminCookieOptions(): CookieOptions {
  return sessionCookieOptions(ADMIN_TTL_SECONDS);
}

export function pilotCookieOptions(): CookieOptions {
  return sessionCookieOptions(PILOT_TTL_SECONDS);
}

export function clearCookieOptions(): CookieOptions {
  return { ...sessionCookieOptions(0), maxAge: 0 };
}

async function readSession(
  req: NextRequest,
  cookieName: string,
  expectedRole: SessionRole,
): Promise<SessionPayload | null> {
  const token = req.cookies.get(cookieName)?.value;
  if (!token) return null;
  try {
    return await verifySession(token, expectedRole);
  } catch {
    return null;
  }
}

export async function requireAdmin(
  req: NextRequest,
): Promise<{ ok: true; payload: SessionPayload } | { ok: false; response: NextResponse }> {
  const payload = await readSession(req, ADMIN_COOKIE, "admin");
  if (!payload) {
    return {
      ok: false,
      response: NextResponse.json({ error: "미인증" }, { status: 401 }),
    };
  }
  return { ok: true, payload };
}

export async function requirePilot(
  req: NextRequest,
): Promise<{ ok: true; payload: SessionPayload } | { ok: false; response: NextResponse }> {
  const payload = await readSession(req, PILOT_COOKIE, "pilot");
  if (!payload) {
    return {
      ok: false,
      response: NextResponse.json({ error: "미인증" }, { status: 401 }),
    };
  }
  return { ok: true, payload };
}
