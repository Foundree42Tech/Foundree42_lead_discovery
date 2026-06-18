import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const rawScore = parseInt(searchParams.get("minScore") ?? "0");
  const minScore = isNaN(rawScore) ? 0 : Math.max(0, Math.min(rawScore, 100));
  const leads = await prisma.lead.findMany({
    where: { userId, score: { gte: minScore } },
    orderBy: { score: "desc" },
  });
  return NextResponse.json(leads);
}

export async function DELETE(req: Request) {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { searchParams } = new URL(req.url);

  // Clear-all: delete every lead owned by this user
  if (searchParams.get("all") === "true") {
    const { count } = await prisma.lead.deleteMany({ where: { userId } });
    return NextResponse.json({ ok: true, deleted: count });
  }

  const id = parseInt(searchParams.get("id") ?? "0");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // Verify ownership before deleting
  const lead = await prisma.lead.findUnique({ where: { id }, select: { userId: true } });
  if (!lead || lead.userId !== userId) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await prisma.lead.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
