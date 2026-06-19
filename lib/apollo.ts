export interface ApolloOrg {
  name?: string;
  // Fields present on richer plans (kept as graceful fallbacks)
  industry?: string;
  estimated_num_employees?: number;
  annual_revenue_printed?: string;
  city?: string;
  state?: string;
  short_description?: string;
  technologies?: { name: string }[];
  // Fields the org search actually returns on standard plans
  organization_revenue_printed?: string;
  organization_revenue?: number;
  founded_year?: number;
  publicly_traded_symbol?: string;
  publicly_traded_exchange?: string;
  primary_domain?: string;
  website_url?: string;
  organization_headcount_twelve_month_growth?: number;
  organization_headcount_twenty_four_month_growth?: number;
}

export interface ApolloContact {
  name: string;
  title: string;
  email: string;
  linkedin: string;
}

export async function apolloCompanySearch(
  industry: string,
  location: string,
  empRange: string,
  count: number,
  apiKey: string
): Promise<ApolloOrg[]> {
  try {
    const res = await fetch("https://api.apollo.io/v1/mixed_companies/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Api-Key": apiKey },
      body: JSON.stringify({
        q_organization_keyword_tags: [industry],
        organization_locations: [location],
        organization_num_employees_ranges: [empRange],
        page: 1,
        per_page: count,
      }),
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json();
    return (data.organizations ?? []) as ApolloOrg[];
  } catch {
    return [];
  }
}

// Apollo matches on the canonical company name ("Notion"), so clean up the noisy
// names the discovery sources produce before searching for people:
//  - strip AI annotations in parentheses/brackets
//    ("HealthSouth (Phoenix Operations - Encompass successor)" → "HealthSouth")
//  - strip common legal/descriptive suffixes
//    ("Notion Labs", "Flexton Inc.", "SolarMax Technologies")
export function normalizeCompanyName(name: string): string {
  const cleaned = name
    .replace(/\([^)]*\)/g, " ")   // (parenthetical annotations)
    .replace(/\[[^\]]*\]/g, " ")  // [bracketed annotations]
    .replace(/[.,]/g, " ")
    .replace(/\b(inc|llc|ltd|corp|corporation|co|company|group|holdings|labs|technologies|technology|software|solutions|systems|global|international)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || name.trim();
}

interface ApolloPerson {
  name?: string;
  first_name?: string;
  last_name?: string;
  last_name_obfuscated?: string;
  title?: string;
  email?: string;
  linkedin_url?: string;
}

// Broad leadership titles used as a fallback when the targeted decision-maker
// titles match nobody — common for small or non-sales orgs (clinics, schools)
// where the buyer is an Owner/Administrator/Practice Manager rather than a VP Sales.
const BROAD_LEADERSHIP_TITLES = [
  "Owner", "Founder", "CEO", "Chief Executive Officer", "President",
  "Executive Director", "Administrator", "Practice Manager", "Office Manager",
  "Managing Director", "General Manager", "COO", "Chief Operating Officer",
  "Vice President", "Director",
];

// NOTE: the old `mixed_people/search` endpoint is deprecated for API callers
// (returns HTTP 422). The current endpoint is `mixed_people/api_search`.
async function fetchApolloPeople(orgName: string, titles: string[], apiKey: string): Promise<ApolloPerson[]> {
  const res = await fetch("https://api.apollo.io/v1/mixed_people/api_search", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Api-Key": apiKey },
    body: JSON.stringify({
      q_organization_name: orgName,
      person_titles: titles,
      page: 1,
      per_page: 5,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.people ?? []) as ApolloPerson[];
}

export async function apolloPeopleSearch(
  companyName: string,
  titles: string[],
  apiKey: string
): Promise<ApolloContact[]> {
  try {
    const org = normalizeCompanyName(companyName);
    let people = await fetchApolloPeople(org, titles, apiKey);
    // Fall back to a broad leadership search if the targeted titles matched no one.
    if (people.length === 0) {
      people = await fetchApolloPeople(org, BROAD_LEADERSHIP_TITLES, apiKey);
    }
    return people
      .map((p) => {
        // Free/basic Apollo API plans redact full names, emails, and LinkedIn URLs
        // (returning first_name + an obfuscated last name). Full enrichment requires
        // a paid plan with credits. Use whatever is available.
        const last = p.last_name ?? p.last_name_obfuscated ?? "";
        const name = p.name ?? [p.first_name, last].filter(Boolean).join(" ").trim();
        const email = p.email && !/not_unlocked|^email_/i.test(p.email) ? p.email : "";
        return {
          name,
          title:    p.title    ?? "",
          email,
          linkedin: p.linkedin_url ?? "",
        };
      })
      .filter((c) => c.name || c.title);
  } catch {
    return [];
  }
}
