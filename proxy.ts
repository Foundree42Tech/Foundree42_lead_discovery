import { NextRequest, NextResponse } from "next/server";

const COOKIE = "f42_session";
const SECRET = process.env.SESSION_SECRET as string;
if (!SECRET) throw new Error("SESSION_SECRET environment variable is required");

const PUBLIC = [
  "/sign-in", "/sign-up",
  "/forgot-password", "/reset-password", "/verify-email",
  "/api/auth/signin", "/api/auth/signup",
  "/api/auth/verify-email", "/api/auth/forgot-password", "/api/auth/reset-password",
];

function hexToArrayBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes.buffer as ArrayBuffer;
}

async function verifyToken(token: string): Promise<boolean> {
  try {
    // base64url → base64 → string
    const b64     = token.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(b64);
    const parts   = decoded.split(":");
    if (parts.length !== 3) return false;
    const [userId, ts, mac] = parts;
    const payload = `${userId}:${ts}`;

    const enc  = new TextEncoder();
    const key  = await crypto.subtle.importKey(
      "raw", enc.encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
    );
    const ok = await crypto.subtle.verify("HMAC", key, hexToArrayBuffer(mac), enc.encode(payload));
    if (!ok) return false;
    if (Date.now() - parseInt(ts) > 14 * 24 * 60 * 60 * 1000) return false;
    return true;
  } catch {
    return false;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const token = req.cookies.get(COOKIE)?.value;
  if (token && await verifyToken(token)) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/sign-in";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
