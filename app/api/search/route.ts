import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { discoverApollo, discoverTavily, discoverAI, Lead } from "@/lib/discovery";
import { logActivity } from "@/lib/activity";
import { decrypt } from "@/lib/crypto";

async function getKeys() {
  const rows = await prisma.config.findMany({ where: { key: { in: ["anthropic", "apollo", "tavily"] } } });
  const map = Object.fromEntries(rows.map((r) => [r.key, decrypt(r.value)]));
  return { anthropic: map.anthropic ?? "", apollo: map.apollo ?? "", tavily: map.tavily ?? "" };
}

export async function POST(req: Request) {
  try {
    const userId = await getSession();
    const body = await req.json() as {
      industry: string; location: string; revenue: string; size: string;
      signals: string; count: number; minScore: number;
      engagementType: string; targetCRMs: string[]; fundingStage: string;
    };

    const keys = await getKeys();
    if (!keys.anthropic) return NextResponse.json({ error: "Anthropic API key not configured." }, { status: 400 });

    const { industry, location, revenue, size, signals, count, minScore, engagementType = "any", targetCRMs = [], fundingStage = "any" } = body;
    const all: Lead[] = [];

    // Gate each source on how many *qualifying* leads we have (score >= minScore),
    // not the raw count. Otherwise a source that returns a full batch of low-quality
    // matches (e.g. Apollo keyword hits that score below minScore) would fill the
    // quota and suppress the higher-quality AI fallback — yielding zero results.
    const qualifyingCount = () => all.filter((l) => l.score >= minScore).length;

    // PRIMARY — AI discovery returns relevant, fully-classified companies with
    // why-fit, buying signals, and ICP tier. It is the most reliable source, so
    // it leads. Apollo/Tavily only supplement when it under-delivers.
    {
      const leads = await discoverAI(industry, location, revenue, size, signals || "CRM scaling sales", engagementType, targetCRMs, fundingStage, count, keys);
      all.push(...leads);
    }

    // SUPPLEMENT — live web-search source, only if AI returned too few qualifying leads.
    if (keys.tavily && qualifyingCount() < count) {
      const existing = new Set(all.map((l) => l.company.toLowerCase()));
      const needed = count - qualifyingCount();
      const leads = await discoverTavily(industry, location, signals || "Salesforce CRM hiring scaling", engagementType, targetCRMs, fundingStage, needed, keys);
      leads.filter((l) => !existing.has(l.company.toLowerCase())).forEach((l) => all.push(l));
    }

    // SUPPLEMENT — Apollo backstops discovery if still short. Apollo's primary
    // value is contact enrichment (see the "Find people" action), not discovery,
    // so it runs last and only to fill a gap.
    if (keys.apollo && qualifyingCount() < count) {
      const existing = new Set(all.map((l) => l.company.toLowerCase()));
      const needed = count - qualifyingCount();
      const leads = await discoverApollo(industry, location, size, signals || "CRM scaling sales ops", engagementType, targetCRMs, fundingStage, needed, keys);
      leads.filter((l) => !existing.has(l.company.toLowerCase())).forEach((l) => all.push(l));
    }

    const seen = new Set<string>();
    const deduped = all
      .sort((a, b) => b.score - a.score)
      .filter((l) => {
        const key = l.company.toLowerCase();
        if (seen.has(key) || l.score < minScore) return false;
        seen.add(key);
        return true;
      });

    // Filter out companies already in the database
    const names    = deduped.map((l) => l.company.toLowerCase());
    const existing = await prisma.lead.findMany({
      where: { company: { in: names, mode: "insensitive" } },
      select: { company: true },
    });
    const existingSet    = new Set(existing.map((l) => l.company.toLowerCase()));
    const newLeads       = deduped.filter((l) => !existingSet.has(l.company.toLowerCase()));
    const skippedDuplicates = deduped.length - newLeads.length;

    const saved = await Promise.all(
      newLeads.map(async (l) => {
        const lead = await prisma.lead.create({
          data: {
            company: l.company, industry: l.industry, employees: l.employees,
            revenue: l.revenue, location: l.location, score: l.score,
            icp: l.icp, whyFit: l.whyFit, trigger: l.trigger, source: l.source,
            verified: l.verified,
            contacts: l.contacts as object[], technologies: l.technologies as string[],
            newsSignals: l.newsSignals as string[], targetRoles: l.targetRoles as object,
            userId,
          },
        });
        const facts = [l.industry, l.employees ? `${l.employees} employees` : null, l.location]
          .filter(Boolean).join(" · ");
        const detail = [
          facts,
          l.icp ? `ICP: ${l.icp}` : null,
          l.trigger ? `Signal: ${l.trigger}` : null,
        ].filter(Boolean).join(" — ");
        await logActivity(
          lead.id,
          "discovered",
          `${l.company} discovered via ${l.source ?? "AI"} — score ${l.score}/100${detail ? ` · ${detail}` : ""}`,
        );
        return lead;
      })
    );

    await prisma.search.create({ data: { params: body, leadCount: saved.length, userId } });
    return NextResponse.json({ leads: saved, skippedDuplicates });
  } catch (e) {
    console.error("Search error:", e);
    return NextResponse.json({ error: "Search failed. Check server logs." }, { status: 500 });
  }
}
