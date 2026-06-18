import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/ratelimit";

export async function POST(req: NextRequest) {
  const { email } = await req.json() as { email: string };

  if (!email) return NextResponse.json({ error: "Email is required." }, { status: 400 });

  if (!checkRateLimit(`forgot:${email.toLowerCase()}`, 3, 15 * 60_000)) {
    return NextResponse.json({ ok: true });
  }

  // Always return the same response to prevent email enumeration
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

  if (user) {
    const resetToken       = randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry },
    });

    await sendPasswordResetEmail(user.email, resetToken);
  }

  return NextResponse.json({ ok: true });
}
