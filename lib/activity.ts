import { prisma } from "./db";

export type ActivityType =
  | "discovered"
  | "status_changed"
  | "outreach_written"
  | "note_saved"
  | "sf_pushed"
  | "researched";

export async function logActivity(
  leadId: number,
  type: ActivityType,
  description: string
): Promise<void> {
  try {
    await prisma.leadActivity.create({ data: { leadId, type, description } });
  } catch {
    // Non-critical — never let activity logging break the main flow
  }
}
