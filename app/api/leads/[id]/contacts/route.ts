import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { apolloPeopleSearch } from "@/lib/apollo";
import { getTargetRoles } from "@/lib/discovery";
import { logActivity } from "@/lib/activity";

// POST /api/leads/[id]/contacts — find real people at this company via Apollo
// and attach them to the lead. Works for any lead, including AI-discovered ones
// that were saved without contacts.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { id } = await params;
  const leadId = parseInt(id);
  if (isNaN(leadId)) return NextResponse.json({ error: "Invalid id." }, { status: 400 });

  const lead = await prisma.lead.findUnique({ where: { id: leadId, userId } });
  if (!lead) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const row = await prisma.config.findUnique({ where: { key: "apollo" } });
  const apolloKey = row?.value ? decrypt(row.value) : "";
  if (!apolloKey) {
    return NextResponse.json({ error: "Apollo API key not configured. Add it in Settings → API Keys." }, { status: 400 });
  }

  const roles = getTargetRoles(lead.employees ?? "200");
  const contacts = await apolloPeopleSearch(lead.company, [...roles.primary, ...roles.secondary], apolloKey);

  if (contacts.length === 0) {
    return NextResponse.json({ contacts: [], message: "No contacts found for this company in Apollo." });
  }

  await prisma.lead.update({ where: { id: leadId }, data: { contacts: contacts as object[] } });
  await logActivity(leadId, "researched", `Found ${contacts.length} contact${contacts.length !== 1 ? "s" : ""} at ${lead.company} via Apollo`);

  return NextResponse.json({ contacts });
}
