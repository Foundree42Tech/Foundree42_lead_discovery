import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity";

const VALID_STATUSES = ["new", "contacted", "qualified", "dead", "won"] as const;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { id } = await params;
  const leadId = parseInt(id);
  if (!leadId) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const lead = await prisma.lead.findUnique({ where: { id: leadId, userId } });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(lead);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { id } = await params;
  const leadId = parseInt(id);
  if (!leadId) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  // Verify ownership
  const existing = await prisma.lead.findUnique({ where: { id: leadId, userId }, select: { status: true, linkedinDm: true } });
  if (!existing) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const body = await req.json() as {
    status?: string;
    notes?: string;
    currentCRM?: string;
    painPoints?: string[];
    pitchStrategy?: object;
    linkedinDm?: string;
    coldEmail?: string;
    emailSubject?: string;
    followupEmail?: string;
    connectionNote?: string;
    outreachScore?: number;
    dealValue?: number;
    followUpAt?: string;
  };

  // Input validation
  if (body.status !== undefined && !VALID_STATUSES.includes(body.status as typeof VALID_STATUSES[number])) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }
  if (body.notes !== undefined && body.notes.length > 20000) {
    return NextResponse.json({ error: "Notes too long (max 20000 chars)." }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (body.status        !== undefined) data.status        = body.status;
  if (body.notes         !== undefined) data.notes         = body.notes;
  if (body.currentCRM    !== undefined) data.currentCRM    = body.currentCRM;
  if (body.painPoints    !== undefined) data.painPoints    = body.painPoints;
  if (body.pitchStrategy !== undefined) data.pitchStrategy = body.pitchStrategy;
  if (body.linkedinDm    !== undefined) data.linkedinDm    = body.linkedinDm;
  if (body.coldEmail     !== undefined) data.coldEmail     = body.coldEmail;
  if (body.emailSubject  !== undefined) data.emailSubject  = body.emailSubject;
  if (body.followupEmail !== undefined) data.followupEmail = body.followupEmail;
  if (body.connectionNote !== undefined) data.connectionNote = body.connectionNote;
  if (body.outreachScore !== undefined) data.outreachScore = body.outreachScore;
  if (body.dealValue     !== undefined) data.dealValue     = body.dealValue;
  if (body.followUpAt    !== undefined) data.followUpAt    = body.followUpAt ? new Date(body.followUpAt) : null;

  const updated = await prisma.lead.update({ where: { id: leadId }, data });

  if (body.status !== undefined && body.status !== existing.status) {
    await logActivity(leadId, "status_changed", `Status changed from ${existing.status} → ${body.status}`);
  }
  if (body.linkedinDm !== undefined && !existing.linkedinDm && body.linkedinDm) {
    await logActivity(leadId, "outreach_written", "Outreach messages written and saved");
  }
  if (body.notes !== undefined) {
    await logActivity(leadId, "note_saved", "Notes updated");
  }

  return NextResponse.json(updated);
}
