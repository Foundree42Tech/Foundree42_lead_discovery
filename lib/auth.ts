import bcrypt from "bcryptjs";
import { createHmac } from "crypto";
import { cookies } from "next/headers";

const COOKIE = "f42_session";
const SECRET = process.env.SESSION_SECRET as string;
if (!SECRET) throw new Error("SESSION_SECRET environment variable is required");

// ── Password ──────────────────────────────────────────────
export const hashPassword   = (pw: string) => bcrypt.hash(pw, 12);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

// ── Session token: "userId:timestamp:hmac" ────────────────
function sign(userId: number): string {
  const ts      = Date.now().toString();
  const payload = `${userId}:${ts}`;
  const mac     = createHmac("sha256", SECRET).update(payload).digest("hex");
  return Buffer.from(`${payload}:${mac}`).toString("base64url");
}

function verify(token: string): number | null {
  try {
    const decoded  = Buffer.from(token, "base64url").toString();
    const parts    = decoded.split(":");
    if (parts.length !== 3) return null;
    const [userId, ts, mac] = parts;
    const payload  = `${userId}:${ts}`;
    const expected = createHmac("sha256", SECRET).update(payload).digest("hex");
    if (mac !== expected) return null;
    if (Date.now() - parseInt(ts) > 14 * 24 * 60 * 60 * 1000) return null;
    return parseInt(userId);
  } catch {
    return null;
  }
}

// ── Cookie helpers (server-side only) ─────────────────────
export async function createSession(userId: number) {
  const store = await cookies();
  store.set(COOKIE, sign(userId), {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    path:     "/",
    maxAge:   14 * 24 * 60 * 60,
  });
}

export async function getSession(): Promise<number | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  return verify(token);
}

export async function clearSession() {
  const store = await cookies();
  store.delete(COOKIE);
}
