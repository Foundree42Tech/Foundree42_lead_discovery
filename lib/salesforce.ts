import { prisma } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/crypto";

const SF_CLIENT_ID     = process.env.SF_CLIENT_ID     ?? "";
const SF_CLIENT_SECRET = process.env.SF_CLIENT_SECRET ?? "";

export interface SFTokens {
  accessToken:  string;
  instanceUrl:  string;
}

export async function getUserSFTokens(userId: number): Promise<SFTokens | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { sfAccessToken: true, sfRefreshToken: true, sfInstanceUrl: true, sfTokenExpiry: true },
  });

  if (!user?.sfAccessToken || !user.sfRefreshToken || !user.sfInstanceUrl) return null;

  // Refresh if within 5 minutes of expiry
  const needsRefresh = !user.sfTokenExpiry || user.sfTokenExpiry.getTime() < Date.now() + 5 * 60 * 1000;

  if (needsRefresh) {
    const loginHost = process.env.SF_LOGIN_URL ?? "https://login.salesforce.com";
    const res = await fetch(`${loginHost}/services/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type:    "refresh_token",
        client_id:     SF_CLIENT_ID,
        client_secret: SF_CLIENT_SECRET,
        refresh_token: decrypt(user.sfRefreshToken),
      }),
    });
    if (!res.ok) return null;
    const { access_token, instance_url } = await res.json() as { access_token: string; instance_url: string };
    await prisma.user.update({
      where: { id: userId },
      data: { sfAccessToken: encrypt(access_token), sfInstanceUrl: instance_url, sfTokenExpiry: new Date(Date.now() + 2 * 60 * 60 * 1000) },
    });
    return { accessToken: access_token, instanceUrl: instance_url };
  }

  return { accessToken: decrypt(user.sfAccessToken), instanceUrl: user.sfInstanceUrl };
}

interface SFContact { name?: string; title?: string; email?: string }

export async function pushLeadToSalesforce(
  lead: {
    company: string; industry: string | null; employees: string | null;
    revenue: string | null; location: string | null; whyFit: string | null; trigger: string | null;
    contacts?: unknown;
  },
  tokens: SFTokens
): Promise<{ sfLeadId: string }> {
  const empNum = parseInt((lead.employees ?? "").match(/\d+/)?.[0] ?? "0");

  // Salesforce Lead requires LastName + Company. Push the primary contact (a real
  // person) when we have one; otherwise fall back to a company-level lead with the
  // company name as LastName so the required fields are always satisfied.
  const contacts = Array.isArray(lead.contacts) ? (lead.contacts as SFContact[]) : [];
  const primary = contacts.find((c) => c && c.name);

  let firstName: string | undefined;
  let lastName: string;
  if (primary?.name) {
    const parts = primary.name.trim().split(/\s+/);
    firstName = parts.length > 1 ? parts[0] : undefined;
    lastName  = parts.length > 1 ? parts.slice(1).join(" ") : parts[0];
  } else {
    lastName = lead.company; // company-level fallback
  }

  const payload = {
    FirstName:         firstName,
    LastName:          lastName,            // required
    Company:           lead.company,        // required
    Title:             primary?.title || undefined,
    Email:             primary?.email || undefined,
    Industry:          lead.industry ?? "",
    LeadSource:        "Foundree42 Lead Discovery",
    Description:       [lead.whyFit, lead.trigger].filter(Boolean).join(" | "),
    NumberOfEmployees: empNum || undefined,
    City:              lead.location?.split(",")[0]?.trim() ?? "",
    State:             lead.location?.split(",")[1]?.trim() ?? "",
  };

  const res = await fetch(`${tokens.instanceUrl}/services/data/v59.0/sobjects/Lead`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokens.accessToken}` },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(await res.text());
  const { id } = await res.json() as { id: string };
  return { sfLeadId: id };
}
