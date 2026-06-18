import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const searches = await prisma.search.findMany({
    where:   { userId },
    orderBy: { ranAt: "desc" },
    take:    10,
  });

  return NextResponse.json(searches);
}
