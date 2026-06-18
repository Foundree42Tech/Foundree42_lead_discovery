import { askAI, parseJSON } from "./ai";
import { apolloCompanySearch, apolloPeopleSearch, ApolloContact } from "./apollo";
import { tavilySearch, newsSearch } from "./tavily";

export interface TargetRoles {
  primary: string[];
  secondary: string[];
  note: string;
}

export interface Lead {
  company: string;
  industry: string;
  employees: string;
  revenue: string;
  location: string;
  score: number;
  icp: string;
  whyFit: string;
  trigger: string;
  source: string;
  verified: boolean;
  contacts: ApolloContact[];
  technologies: string[];
  newsSignals: string[];
  targetRoles: TargetRoles;
  foundAt: string;
}

export interface Keys {
  anthropic: string;
  apollo: string;
  tavily: string;
}

const ICP_DEFS = `ICP tier definitions:
ICP1 = Perfect: enterprise or fast-scaling mid-market, 200–5000 employees, clear CRM pain, buying signals present, decision-maker accessible.
ICP2 = Strong: mid-market, 50–500 employees, growing, using a CRM but struggling or on a competitor.
ICP3 = Moderate: SMB, 20–200 employees, some signals of CRM need, may need education.
ICP4 = Possible: small company, early-stage signals, longer sales cycle.
ICP5 = Weak: company in the industry but no specific indicators.
ICP6 = Not a fit: consumer-facing, non-profit, government, or already expertly staffed on Salesforce.`;

function buildEngagementContext(engagementType: string, targetCRMs: string[], fundingStage: string): string {
  const parts: string[] = [];

  if (engagementType === "new_impl")
    parts.push("Focus: New Salesforce implementation. Target companies with no CRM, using spreadsheets, or outgrowing manual processes. Signal: ops chaos, rapid headcount growth, no sales ops hire yet.");
  else if (engagementType === "migration")
    parts.push("Focus: CRM migration to Salesforce. Target companies actively using a competitor CRM who would benefit from switching.");
  else if (engagementType === "optimization")
    parts.push("Focus: Salesforce optimization. Target existing Salesforce customers with poor adoption, no dedicated admin/developer, or data quality issues. Signal: Salesforce in tech stack but no SF admin job listings.");

  if (targetCRMs.length > 0 && engagementType !== "optimization")
    parts.push(`Target CRM: Companies currently using ${targetCRMs.join(" or ")}. This is a migration opportunity.`);

  if (fundingStage === "bootstrapped")
    parts.push("Funding: Bootstrapped. Emphasize ROI and efficiency. Expect slower sales cycle.");
  else if (fundingStage === "seed_b")
    parts.push("Funding: Seed through Series B. Fast-growing, likely in CRM chaos, highest urgency. Prioritize companies with recent funding announcements.");
  else if (fundingStage === "series_c")
    parts.push("Funding: Series C or later / pre-IPO. Revenue scale demands proper RevOps. Procurement may be involved.");
  else if (fundingStage === "public")
    parts.push("Funding: Public company. Compliance and reporting requirements add Salesforce urgency. Expect longer cycle with IT involvement.");

  return parts.length ? `\n\nEngagement context:\n${parts.join("\n")}` : "";
}

const SIZE_MAP: Record<string, string> = {
  "1-50 employees":           "1,50",
  "50-200 employees":         "50,200",
  "200-500 employees":        "200,500",
  "500-2,000 employees":      "500,2000",
  "2,000-10,000 employees":   "2000,10000",
  "10,000+ employees":        "10000,100000",
  "Any size":                 "1,100000",
};

export function getTargetRoles(empRaw: string | number): TargetRoles {
  let count = 300;
  try { count = parseInt(String(empRaw).replace(/,/g, "").split(/[-–]/)[0].trim()); } catch { /* use default */ }

  if (count <= 50) return {
    primary:   ["CEO / Founder / Owner", "VP of Sales", "Head of Operations"],
    secondary: ["Director of Technology", "Sales Manager"],
    note:      "Small company — CEO is a valid primary contact.",
  };
  if (count <= 200) return {
    primary:   ["VP of Sales", "Head of Operations", "Director of Revenue Operations"],
    secondary: ["COO", "Head of CRM", "Director of Sales Operations"],
    note:      "Growing company — focus on sales and ops leaders.",
  };
  if (count <= 1000) return {
    primary:   ["Director of Revenue Operations", "VP Revenue Operations", "Head of CRM"],
    secondary: ["Salesforce Manager", "Director of Sales Operations", "Director of IT Applications"],
    note:      "Mid-market — target CRM and RevOps leaders.",
  };
  return {
    primary:   ["Salesforce Platform Owner", "VP Revenue Operations", "Director of Revenue Operations"],
    secondary: ["Head of CRM", "Director of IT Applications", "Enterprise Architect"],
    note:      "Enterprise — target Salesforce and RevOps leaders only. Never CEO.",
  };
}

async function scoreCompany(
  data: { name: string; industry: string; employees: string; revenue: string; description: string; technologies: string[]; signals?: string; engagementType?: string; targetCRMs?: string[]; fundingStage?: string },
  apiKey: string
): Promise<{ score: number; whyFit: string; trigger: string; bestContact: string; icp: string }> {
  const engCtx = buildEngagementContext(data.engagementType ?? "any", data.targetCRMs ?? [], data.fundingStage ?? "any");
  const prompt = `Score this company for Salesforce consultancy fit for Foundree42.

Company: ${data.name}
Industry: ${data.industry}
Employees: ${data.employees}
Revenue: ${data.revenue}
Description: ${data.description.slice(0, 200)}
Technologies: ${JSON.stringify(data.technologies.slice(0, 5))}
Buying signals to watch for: ${data.signals || "CRM scaling, hiring ops roles, recent funding, new leadership"}

Score 0–100:
90–100 = Perfect ICP. Clear pain + buying trigger + right size + accessible buyer.
75–89  = Strong fit. Right size and industry, 1–2 positive signals.
60–74  = Moderate fit. Industry match but weaker signals or size mismatch.
40–59  = Weak. Possible need but no clear trigger.
<40    = Not a fit.

Technology scoring hints:
- Using HubSpot, Zoho, Pipedrive, Dynamics, or spreadsheets → +10 (migration opportunity)
- Using Salesforce but no dedicated admin/developer → +8 (optimization opportunity)
- Using Salesforce with dedicated team → +2 (lower urgency)
- Using SAP, Oracle, or enterprise suite → +5 (possible adjacent opportunity)
${engCtx}

${ICP_DEFS}

Return ONLY: {"score":75,"why_fit":"one sentence on fit","trigger":"specific buying signal","best_contact":"best title to reach","icp":"ICP1"}`;
  const raw = await askAI(prompt, apiKey);
  const result = parseJSON(raw);
  if (result && typeof result === "object" && !Array.isArray(result)) {
    const r = result as Record<string, unknown>;
    return {
      score:       typeof r.score       === "number" ? r.score : 65,
      whyFit:      typeof r.why_fit     === "string" ? r.why_fit : "Potential fit",
      trigger:     typeof r.trigger     === "string" ? r.trigger : "Review manually",
      bestContact: typeof r.best_contact === "string" ? r.best_contact : "VP of Sales",
      icp:         typeof r.icp         === "string" ? r.icp : "ICP3",
    };
  }
  return { score: 65, whyFit: "Potential fit", trigger: "Review manually", bestContact: "VP of Sales", icp: "ICP3" };
}

export async function discoverApollo(
  industry: string,
  location: string,
  size: string,
  signals: string,
  engagementType: string,
  targetCRMs: string[],
  fundingStage: string,
  count: number,
  keys: Keys,
  onProgress?: (pct: number) => void
): Promise<Lead[]> {
  const empRange = SIZE_MAP[size] ?? "200,5000";
  const orgs = await apolloCompanySearch(industry, location, empRange, count, keys.apollo);
  if (!orgs.length) return [];

  // Representative employee count from the requested size band, used when Apollo
  // doesn't return a per-company headcount (standard plans omit it).
  const sizeFloor = parseInt((SIZE_MAP[size] ?? "200,5000").split(",")[0]) || 200;

  const leads: Lead[] = [];
  for (let i = 0; i < orgs.length; i++) {
    onProgress?.((i + 1) / orgs.length);
    const org = orgs[i];

    // Apollo's org search filtered on the requested industry/location/size, but
    // (on standard plans) does NOT echo those fields back, so fall back to the
    // search parameters. Use the data it DOES return — revenue, headcount growth,
    // founded year, public status — both for display and as scoring signal.
    const emp        = org.estimated_num_employees ?? 0;
    const empLabel   = emp ? String(emp) : size;
    const tech       = (org.technologies ?? []).slice(0, 6).map((t) => t.name);
    const revenue    = org.organization_revenue_printed ?? org.annual_revenue_printed ?? "";
    const orgIndustry = org.industry || industry;
    const orgLocation = [org.city, org.state].filter(Boolean).join(", ") || location;

    const growth = org.organization_headcount_twelve_month_growth;
    const growthPct = typeof growth === "number" ? Math.round(growth * 100) : null;
    const descParts: string[] = [];
    if (org.short_description) descParts.push(org.short_description);
    if (growthPct !== null)    descParts.push(`Headcount growth ${growthPct >= 0 ? "+" : ""}${growthPct}% over 12 months`);
    if (org.founded_year)      descParts.push(`Founded ${org.founded_year}`);
    if (org.publicly_traded_symbol) descParts.push(`Public (${org.publicly_traded_exchange ?? ""}:${org.publicly_traded_symbol})`);
    if (org.primary_domain)    descParts.push(`Domain ${org.primary_domain}`);
    const description = descParts.join(". ");

    // Surface strong headcount growth as an explicit buying signal for scoring.
    const growthSignal = growthPct !== null && growthPct >= 15
      ? `rapid headcount growth (+${growthPct}% in 12mo)`
      : "";
    const scoreSignals = [signals, growthSignal].filter(Boolean).join(", ");

    const scored = await scoreCompany({
      name:        org.name ?? "",
      industry:    orgIndustry,
      employees:   empLabel,
      revenue,
      description,
      technologies: tech,
      signals:        scoreSignals || undefined,
      engagementType, targetCRMs, fundingStage,
    }, keys.anthropic);

    const roles = getTargetRoles(emp || sizeFloor);
    const contacts = keys.apollo
      ? await apolloPeopleSearch(org.name ?? "", [...roles.primary, ...roles.secondary], keys.apollo)
      : [];

    leads.push({
      company:     org.name ?? "",
      industry:    orgIndustry,
      employees:   empLabel,
      revenue,
      location:    orgLocation,
      score:       scored.score,
      icp:         scored.icp,
      whyFit:      scored.whyFit,
      trigger:     growthSignal ? `Rapid headcount growth (+${growthPct}% in 12mo)` : scored.trigger,
      source:      "Apollo Verified",
      verified:    true,
      contacts,
      technologies: tech,
      newsSignals:  await newsSearch(org.name ?? ""),
      targetRoles:  roles,
      foundAt:      new Date().toISOString(),
    });
  }
  return leads.sort((a, b) => b.score - a.score);
}

export async function discoverTavily(
  industry: string,
  location: string,
  signals: string,
  engagementType: string,
  targetCRMs: string[],
  fundingStage: string,
  count: number,
  keys: Keys
): Promise<Lead[]> {
  const queries = [
    `${industry} companies ${location} Salesforce CRM 2024 2025`,
    `${industry} business ${location} ${signals || "hiring sales operations"}`,
    `top ${industry} companies ${location} technology CRM`,
    `${industry} firms ${location} revenue growth expansion`,
  ];

  const seen = new Set<string>();
  const allResults: { title: string; content: string }[] = [];
  for (const q of queries) {
    const results = await tavilySearch(q, keys.tavily, 8);
    for (const r of results) {
      if (r.title && !seen.has(r.title)) {
        seen.add(r.title);
        allResults.push(r);
      }
    }
  }
  if (!allResults.length) return [];

  const searchText = allResults
    .slice(0, 20)
    .map((r) => `${r.title} — ${r.content.slice(0, 200)}`)
    .join("\n");

  const engCtx = buildEngagementContext(engagementType, targetCRMs, fundingStage);
  const prompt = `From these web search results, identify up to ${count} real US ${industry} companies near ${location} that would benefit from Salesforce consulting.

Search results:
${searchText}

Rules:
- Only use companies explicitly named in the search results. Do NOT invent or add companies not mentioned.
- If fewer than ${count} are found in the results, return only what is found (do not pad with invented companies).
- Buying signals: recent hiring of ops/sales roles, CRM migration posts, funding announcements, leadership changes, growth press.
${engCtx}

${ICP_DEFS}

Score 0–100:
90–100 = Perfect ICP. 75–89 = Strong. 60–74 = Moderate. 40–59 = Weak. <40 = Not a fit.

Return ONLY a JSON array (may have fewer than ${count} items if fewer were found):
[{"company":"name","industry":"industry","employees":"est headcount","revenue":"est revenue","location":"city, state","why_fit":"one sentence","trigger":"specific signal","score":75,"icp":"ICP2","technologies":["CRM name if known"],"newsSignals":["signal if found"],"source":"Tavily Web Search"}]`;

  const raw = await askAI(prompt, keys.anthropic);
  const result = parseJSON(raw);
  if (!Array.isArray(result)) return [];

  return (result as Record<string, unknown>[]).map((lead) => {
    const emp = String(lead.employees ?? "");
    const empNum = parseInt(emp.match(/\d+/)?.[0] ?? "200");
    const technologies = Array.isArray(lead.technologies) ? (lead.technologies as unknown[]).map(String) : [];
    const newsSignals  = Array.isArray(lead.newsSignals)  ? (lead.newsSignals as unknown[]).map(String)  : [];
    return {
      company:     String(lead.company   ?? ""),
      industry:    String(lead.industry  ?? ""),
      employees:   emp,
      revenue:     String(lead.revenue   ?? ""),
      location:    String(lead.location  ?? ""),
      score:       typeof lead.score === "number" ? lead.score : 65,
      icp:         String(lead.icp       ?? ""),
      whyFit:      String(lead.why_fit   ?? ""),
      trigger:     String(lead.trigger   ?? ""),
      source:      "Tavily Web Search",
      verified:    false,
      contacts:    [],
      technologies,
      newsSignals,
      targetRoles:  getTargetRoles(empNum),
      foundAt:      new Date().toISOString(),
    };
  }).sort((a, b) => b.score - a.score);
}

export async function discoverAI(
  industry: string,
  location: string,
  revenue: string,
  size: string,
  signals: string,
  engagementType: string,
  targetCRMs: string[],
  fundingStage: string,
  count: number,
  keys: Keys
): Promise<Lead[]> {
  const engCtx = buildEngagementContext(engagementType, targetCRMs, fundingStage);
  const prompt = `Generate a list of exactly ${count} real, named US companies that match ALL of these criteria:
- Industry: ${industry}
- Location: ${location} (company HQ or major office)
- Revenue: approximately ${revenue}
- Size: approximately ${size}
- Salesforce fit signals: ${signals || "growing sales team, CRM scaling, revenue operations"}

For each company: you must be certain it exists and matches these criteria. Do NOT invent unknown companies.

Prioritize companies that:
1. Are on a competitor CRM (HubSpot, Zoho, Dynamics, Pipedrive) — migration opportunity
2. Are growing rapidly (recent funding, expansion, new leadership hire)
3. Have a sales or revenue ops team with no dedicated CRM admin
4. Are in an industry that routinely adopts Salesforce (professional services, healthcare, SaaS, manufacturing, financial services, real estate, logistics)
${engCtx}

${ICP_DEFS}

Score 0–100: 90–100=Perfect, 75–89=Strong, 60–74=Moderate, 40–59=Weak, <40=Not a fit.

You MUST return exactly ${count} companies. Return ONLY a JSON array:
[{"company":"exact company name","industry":"specific industry","employees":"headcount range","revenue":"revenue estimate","location":"city, state","why_fit":"one specific sentence","trigger":"one buying signal","score":75,"icp":"ICP2","technologies":["known tech if any"],"newsSignals":["recent signal if any"],"source":"AI Estimate — verify before outreach"}]`;

  const raw = await askAI(prompt, keys.anthropic);
  const result = parseJSON(raw);
  if (!Array.isArray(result)) return [];

  return (result as Record<string, unknown>[]).map((lead) => {
    const emp = String(lead.employees ?? "");
    const empNum = parseInt(emp.match(/\d+/)?.[0] ?? "200");
    const technologies = Array.isArray(lead.technologies) ? (lead.technologies as unknown[]).map(String) : [];
    const newsSignals  = Array.isArray(lead.newsSignals)  ? (lead.newsSignals as unknown[]).map(String)  : [];
    return {
      company:     String(lead.company   ?? ""),
      industry:    String(lead.industry  ?? ""),
      employees:   emp,
      revenue:     String(lead.revenue   ?? ""),
      location:    String(lead.location  ?? ""),
      score:       typeof lead.score === "number" ? lead.score : 65,
      icp:         String(lead.icp       ?? ""),
      whyFit:      String(lead.why_fit   ?? ""),
      trigger:     String(lead.trigger   ?? ""),
      source:      "AI Estimate — verify before outreach",
      verified:    false,
      contacts:    [],
      technologies,
      newsSignals,
      targetRoles:  getTargetRoles(empNum),
      foundAt:      new Date().toISOString(),
    };
  }).sort((a, b) => b.score - a.score);
}
