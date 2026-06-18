# Foundree42 Sales Platform — User Guide

This guide walks through the core workflow: **find companies → find people →
write outreach → push to Salesforce**.

---

## 1. First-time setup

1. **Create an account** at `/sign-up`, verify your email, and sign in.
2. Open **Settings → API Keys** and add:
   - **Anthropic** (required) — powers company discovery, scoring, and outreach.
   - **Apollo** (optional) — enriches companies with real **people/contacts**.
   - **Tavily** (optional) — adds live web-search signals.
3. (Optional) **Settings → Salesforce** — connect your org to push leads. See the
   in-app setup guide there, or [DEPLOY.md](DEPLOY.md) for the Connected App.

Keys are stored **encrypted** in the database (see [SECURITY.md](SECURITY.md)).

---

## 2. Find companies (Discover)

The **Discover** page is where you generate leads.

1. Fill in the search form: industry, location, revenue, size, optional buying
   signals, engagement type, target CRMs, funding stage.
2. Set **Min score** — the quality bar (0–100). Leads scoring below this are
   discarded. Default is 60.
3. Click **Search**.

**How results are sourced** (in order, best-effort):
- **Apollo** — verified company data (if an Apollo key is set).
- **Tavily** — companies surfaced from live web search (if a Tavily key is set).
- **AI** — Claude proposes real, named companies matching your criteria.

Each company is scored 0–100 for Salesforce-consulting fit, with a **why-fit**,
a **buying signal**, and an **ICP tier** (hover the ICP chip for an explanation).
The app automatically skips companies already in your database and tops up from
the AI source so a batch of low-relevance matches never leaves you empty-handed.

> **No results?** Lower the **Min score**, broaden the industry/location, or
> remove restrictive filters. Repeated identical searches return fewer new
> companies because existing leads are de-duplicated. Use **Clear all** to reset.

---

## 3. Find people (contacts)

AI-discovered companies arrive **without contacts**. To attach real people:

1. Expand a lead and find the **Who to Contact** section.
2. Click **Find people**. This queries Apollo for decision-makers at that company
   (VP Sales, RevOps, Head of CRM, COO, etc., chosen by company size) and saves
   them to the lead.

**What you get depends on your Apollo plan:**
- All plans: job **titles** and **first names** — enough to identify who to reach
  and search them on LinkedIn.
- **Paid Apollo plans with enrichment credits**: full names, **email addresses**,
  and LinkedIn URLs. On free/basic API access, last names are obfuscated and
  emails are withheld by Apollo.

Without an Apollo key, the lead instead shows **suggested target roles** with
one-click LinkedIn search links.

---

## 4. Write outreach (optional)

- Click **Write Outreach** on a lead (or open the **Outreach** page).
- The app researches the company and drafts four messages: LinkedIn DM, cold
  email, follow-up, and a connection note. Refine with the quick buttons or a
  custom instruction, then copy or save back to the lead.

---

## 5. Push to Salesforce

Once connected (Settings → Salesforce):

- **Single lead** — click **Push to Salesforce** on a lead.
- **Bulk** — select leads on Discover and use the bulk action bar.

**What gets created:** a Salesforce **Lead** record. The app maps:

| Salesforce field | Source | Notes |
|------------------|--------|-------|
| `LastName` | Primary contact's last name | **Required.** Falls back to the company name if no contact |
| `Company` | Lead company | **Required** |
| `FirstName` | Primary contact's first name | When available |
| `Title` | Primary contact's title | When available |
| `Email` | Primary contact's email | When available (needs Apollo enrichment) |
| `Industry`, `NumberOfEmployees`, `City`, `State` | Lead data | Best-effort |
| `LeadSource` | "Foundree42 Lead Discovery" | Constant |
| `Description` | Why-fit + buying signal | — |

> The **minimum required Salesforce fields** (`LastName`, `Company`) are always
> populated. For a Lead to represent a real **person** with their email, run
> **Find people** first (and use a paid Apollo plan for emails). Otherwise the
> record is created at the company level.

Each user authorizes **their own** Salesforce org — clicking Connect runs an
OAuth login that requires explicit approval. Sandbox orgs: set
`SF_LOGIN_URL=https://test.salesforce.com`.

---

## 6. Manage your pipeline

- **Pipeline** — drag leads across stages (New → Contacted → Qualified → Won/Dead).
- **Dashboard** — weekly stats, funnel, lead sources, hot leads, recent activity.
- **⌘K** — command palette to jump to any lead, page, or action.
- **Settings** — profile, weekly goal, light/dark theme, notifications, keys, Salesforce.

---

## Troubleshooting

| Symptom | Likely cause / fix |
|---------|--------------------|
| Discover returns nothing | Min score too high, or all matches already saved. Lower min score / broaden filters / Clear all. |
| "Anthropic API key not configured" | Add it in Settings → API Keys. |
| **Find people** returns no one | No Apollo key, the plan blocks people search, or the company name didn't match Apollo. |
| Contacts have no email / partial names | Apollo plan limitation — full enrichment requires paid credits. |
| Can't connect Salesforce | Connected App not propagated (wait ~10 min), or `SF_*` env vars not set. See the in-app guide. |
