import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const userId = await getSession();
    if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const leadId = parseInt(searchParams.get("leadId") ?? "");
    if (!leadId) return NextResponse.json({ error: "leadId required" }, { status: 400 });

    // Verify the lead belongs to this user before returning its activities
    const lead = await prisma.lead.findUnique({ where: { id: leadId, userId }, select: { id: true } });
    if (!lead) return NextResponse.json({ error: "Not found." }, { status: 404 });

    const activities = await prisma.leadActivity.findMany({
      where: { leadId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return NextResponse.json(activities);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
