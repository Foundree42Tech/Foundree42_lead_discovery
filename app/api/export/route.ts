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

  const header = [
    "company","industry","employees","revenue","location","score","icp",
    "why_fit","trigger","source","verified","found_at",
    "contact_1_name","contact_1_title","contact_1_email",
    "contact_2_name","contact_2_title","contact_2_email",
  ].join(",");

  const rows = leads.map((l) => {
    const contacts = (l.contacts ?? []) as { name?: string; title?: string; email?: string }[];
    const c1 = contacts[0] ?? {};
    const c2 = contacts[1] ?? {};
    return [
      csv(l.company), csv(l.industry), csv(l.employees), csv(l.revenue),
      csv(l.location), l.score, csv(l.icp), csv(l.whyFit), csv(l.trigger),
      csv(l.source), l.verified ? "true" : "false",
      (l.foundAt?.toISOString() ?? new Date().toISOString()),
      csv(c1.name), csv(c1.title), csv(c1.email),
      csv(c2.name), csv(c2.title), csv(c2.email),
    ].join(",");
  });

  const csv_body = [header, ...rows].join("\n");
  return new NextResponse(csv_body, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="foundree42_leads_${Date.now()}.csv"`,
    },
  });
}

function csv(val: string | null | undefined): string {
  const s = val ?? "";
  return `"${s.replace(/"/g, '""')}"`;
}
