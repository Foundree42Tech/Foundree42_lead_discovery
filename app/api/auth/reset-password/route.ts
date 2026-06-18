import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export async function POST(req: Request) {
  const { token, password } = await req.json() as { token: string; password: string };

  if (!token)           return NextResponse.json({ error: "Missing token." }, { status: 400 });
  if (!password)        return NextResponse.json({ error: "Password is required." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });

  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExpiry: { gt: new Date() },
    },
  });

  if (!user) return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash:     await hashPassword(password),
      resetToken:       null,
      resetTokenExpiry: null,
    },
  });

  return NextResponse.json({ ok: true });
}
