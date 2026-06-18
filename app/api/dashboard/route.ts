import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const userId = await getSession();

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [allLeads, weekLeads, activities, statusGroups, sourceGroups] = await Promise.all([
      // Basic lead counts
      prisma.lead.count({ where: { userId } }),
      prisma.lead.findMany({
        where: { userId, foundAt: { gte: oneWeekAgo } },
        select: { id: true, score: true, company: true, source: true },
      }),
      // Recent activity
      prisma.leadActivity.findMany({
        where: { lead: { userId } },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, type: true, description: true, createdAt: true, leadId: true, lead: { select: { company: true } } },
      }),
      // Leads by status
      prisma.lead.groupBy({
        by: ["status"],
        where: { userId },
        _count: { status: true },
      }),
      // Leads by source
      prisma.lead.groupBy({
        by: ["source"],
        where: { userId },
        _count: { source: true },
      }),
    ]);

    const hotLeadsThisWeek = weekLeads.filter(l => (l.score ?? 0) >= 80);
    const allScores = await prisma.lead.findMany({ where: { userId, score: { not: null } }, select: { score: true } });
    const avgScore = allScores.length > 0
      ? Math.round(allScores.reduce((s, l) => s + (l.score ?? 0), 0) / allScores.length)
      : 0;

    const contactedCount = statusGroups.find(g => g.status === "contacted")?._count?.status ?? 0;
    const contactRate = allLeads > 0 ? Math.round((contactedCount / allLeads) * 100) : 0;

    return NextResponse.json({
      totalLeads:       allLeads,
      leadsThisWeek:    weekLeads.length,
      hotThisWeek:      hotLeadsThisWeek.length,
      avgScore,
      contactRate,
      statusGroups:     statusGroups.map(g => ({ status: g.status, count: g._count.status })),
      sourceGroups:     sourceGroups.filter(g => g.source).map(g => ({ source: g.source!, count: g._count.source })),
      hotLeads:         hotLeadsThisWeek.slice(0, 5),
      recentActivity:   activities,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
