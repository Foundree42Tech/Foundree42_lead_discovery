import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { sfAccessToken: true, sfInstanceUrl: true },
  });

  return NextResponse.json({
    sfConnected:  !!user?.sfAccessToken,
    sfInstanceUrl: user?.sfInstanceUrl ?? null,
  });
}
