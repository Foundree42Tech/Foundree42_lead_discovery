import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const STATUSES = ["new", "contacted", "qualified", "won", "dead"] as const;

export async function GET() {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const leads = await prisma.lead.findMany({
    where: { userId },
    select: {
      id: true, company: true, industry: true, location: true,
      score: true, status: true, linkedinDm: true, dealValue: true,
      followUpAt: true, foundAt: true,
    },
    orderBy: [{ score: "desc" }, { foundAt: "desc" }],
  });

  const grouped: Record<string, typeof leads> = {};
  for (const s of STATUSES) grouped[s] = [];
  for (const lead of leads) {
    const key = STATUSES.includes(lead.status as typeof STATUSES[number]) ? lead.status : "new";
    grouped[key].push(lead);
  }

  return NextResponse.json(grouped);
}
