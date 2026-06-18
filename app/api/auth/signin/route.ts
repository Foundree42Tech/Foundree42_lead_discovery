import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";
import { checkRateLimit } from "@/lib/ratelimit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(`signin:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many sign-in attempts. Try again in a minute." }, { status: 429 });
  }

  const { email, password } = await req.json() as { email: string; password: string };

  if (!email || !password) return NextResponse.json({ error: "Email and password are required." }, { status: 400 });

  const user  = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  const valid = user ? await verifyPassword(password, user.passwordHash) : false;

  // Same error for both "no user" and "wrong password" to prevent email enumeration
  if (!user || !valid) return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });

  if (!user.emailVerified) {
    return NextResponse.json({ error: "Please verify your email before signing in. Check your inbox for the verification link." }, { status: 403 });
  }

  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
