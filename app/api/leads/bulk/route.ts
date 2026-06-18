import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getUserSFTokens, pushLeadToSalesforce } from "@/lib/salesforce";

function parseIds(ids: unknown): number[] | null {
  if (!Array.isArray(ids)) return null;
  const parsed = ids.map((id) => parseInt(String(id)));
  if (parsed.some(isNaN)) return null;
  return parsed;
}

// POST /api/leads/bulk — body must include action: "status" | "delete" | "salesforce"
export async function POST(req: Request) {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await req.json() as { action: string; ids: unknown; status?: string };
  const ids  = parseIds(body.ids);
  if (!ids || ids.length === 0) return NextResponse.json({ error: "No valid IDs provided." }, { status: 400 });
  if (ids.length > 500) return NextResponse.json({ error: "Max 500 IDs per request." }, { status: 400 });

  if (body.action === "status") {
    const validStatuses = ["new", "contacted", "qualified", "dead", "won"];
    if (!body.status || !validStatuses.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    await prisma.lead.updateMany({ where: { id: { in: ids }, userId }, data: { status: body.status } });
    return NextResponse.json({ ok: true, updated: ids.length });
  }

  if (body.action === "delete") {
    await prisma.lead.deleteMany({ where: { id: { in: ids }, userId } });
    return NextResponse.json({ ok: true, deleted: ids.length });
  }

  if (body.action === "salesforce") {
    const tokens = await getUserSFTokens(userId);
    if (!tokens) {
      return NextResponse.json(
        { error: "Salesforce not connected. Click 'Connect Salesforce' in the sidebar." },
        { status: 400 }
      );
    }

    const pushed:  number[] = [];
    const skipped: number[] = [];
    const failed:  { id: number; error: string }[] = [];

    const leads = await prisma.lead.findMany({ where: { id: { in: ids }, userId } });

    for (const lead of leads) {
      if (lead.sfLeadId) {
        skipped.push(lead.id);
        continue;
      }
      try {
        const { sfLeadId } = await pushLeadToSalesforce(lead, tokens);
        await prisma.lead.update({ where: { id: lead.id }, data: { sfLeadId } });
        pushed.push(lead.id);
      } catch (e) {
        console.error(`Salesforce push error (lead ${lead.id}):`, e);
        failed.push({ id: lead.id, error: "Push failed." });
      }
    }

    return NextResponse.json({ ok: true, pushed, skipped, failed });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
