import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getUserSFTokens, pushLeadToSalesforce } from "@/lib/salesforce";
import { logActivity } from "@/lib/activity";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { id } = await params;
  const leadId = parseInt(id);
  if (isNaN(leadId)) return NextResponse.json({ error: "Invalid id." }, { status: 400 });

  const lead = await prisma.lead.findUnique({ where: { id: leadId, userId } });
  if (!lead) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (lead.sfLeadId) return NextResponse.json({ sfLeadId: lead.sfLeadId, alreadyPushed: true });

  const tokens = await getUserSFTokens(userId);
  if (!tokens) {
    return NextResponse.json(
      { error: "Salesforce not connected. Click 'Connect Salesforce' in the sidebar." },
      { status: 400 }
    );
  }

  try {
    const { sfLeadId } = await pushLeadToSalesforce(lead, tokens);
    await prisma.lead.update({ where: { id: leadId }, data: { sfLeadId } });
    await logActivity(leadId, "sf_pushed", `Pushed to Salesforce (ID: ${sfLeadId})`);
    return NextResponse.json({ sfLeadId });
  } catch (e) {
    console.error("Salesforce push error:", e);
    return NextResponse.json({ error: "Failed to push lead to Salesforce." }, { status: 502 });
  }
}
