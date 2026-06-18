import { askAI, parseJSON } from "./ai";
import { tavilySearch, newsSearch } from "./tavily";

export interface CompanyIntelligence {
  overview: string;
  industry: string;
  estimatedSize: string;
  headquarters: string;
  currentCRM: string;
  icpScore: number;
  icpTier: string;
  painPoints: string[];
  recentTriggers: string[];
  idealContacts: { title: string; why: string; priority: "primary" | "secondary" }[];
  dataQuality: "high" | "medium" | "low";
}

export interface PitchStrategy {
  pitchAngle: string;
  openingLine: string;
  valueProps: string[];
  objectionHandling: string;
  cta: string;
}

export interface OutreachMessages {
  linkedinDm: string;
  coldEmail: string;
  emailSubject: string;
  followupEmail: string;
  connectionNote: string;
}

export async function gatherSignals(company: string, tavilyKey: string): Promise<string> {
  const queries = [
    `${company} company overview CRM technology 2025`,
    `${company} recent news funding hiring leadership`,
  ];
  const lines: string[] = [];
  for (const q of queries) {
    const results = await tavilySearch(q, tavilyKey, 5);
    lines.push(...results.map((r) => `${r.title} — ${r.content.slice(0, 300)}`));
  }
  const news = await newsSearch(company);
  if (news.length) lines.push(...news.map((n) => `News: ${n}`));
  return lines.slice(0, 12).join("\n") || "No signals found from web search.";
}

export async function analyzeCompany(
  company: string,
  signals: string,
  known: { industry?: string; employees?: string; trigger?: string; technologies?: string[] },
  apiKey: string
): Promise<CompanyIntelligence> {
  const knownCtx = [
    known.industry    && `Known industry: ${known.industry}`,
    known.employees   && `Known size: ${known.employees} employees`,
    known.trigger     && `Known buying trigger: ${known.trigger}`,
    known.technologies?.length && `Known tech stack: ${known.technologies.join(", ")}`,
  ].filter(Boolean).join("\n");

  const prompt = `Analyze this company as a potential Salesforce consultancy client for Foundree42.

Company: ${company}
${knownCtx}

Intelligence from web search:
${signals}

Return ONLY valid JSON:
{"overview":"2-sentence description","industry":"specific vertical","estimatedSize":"headcount estimate","headquarters":"city, state","currentCRM":"likely CRM (HubSpot/Zoho/Dynamics/Pipedrive/Salesforce/Spreadsheets/Unknown)","icpScore":75,"icpTier":"ICP2","painPoints":["pain 1","pain 2","pain 3"],"recentTriggers":["trigger 1","trigger 2"],"idealContacts":[{"title":"VP of Sales","why":"owns CRM budget","priority":"primary"},{"title":"Head of Revenue Operations","why":"manages tech stack","priority":"secondary"}],"dataQuality":"medium"}`;

  const raw = await askAI(prompt, apiKey);
  const r = parseJSON(raw) as Record<string, unknown>;
  return {
    overview:       String(r.overview      ?? ""),
    industry:       String(r.industry      ?? known.industry ?? ""),
    estimatedSize:  String(r.estimatedSize ?? known.employees ?? ""),
    headquarters:   String(r.headquarters  ?? ""),
    currentCRM:     String(r.currentCRM    ?? "Unknown"),
    icpScore:       typeof r.icpScore === "number" ? r.icpScore : 65,
    icpTier:        String(r.icpTier       ?? "ICP3"),
    painPoints:     Array.isArray(r.painPoints)     ? (r.painPoints as unknown[]).map(String)     : [],
    recentTriggers: Array.isArray(r.recentTriggers) ? (r.recentTriggers as unknown[]).map(String) : [],
    idealContacts:  Array.isArray(r.idealContacts)  ? (r.idealContacts as CompanyIntelligence["idealContacts"]) : [],
    dataQuality:    (["high","medium","low"].includes(r.dataQuality as string) ? r.dataQuality : "medium") as "high" | "medium" | "low",
  };
}

export async function buildPitchStrategy(
  company: string,
  intelligence: CompanyIntelligence,
  apiKey: string
): Promise<PitchStrategy> {
  const prompt = `Build a Salesforce consultancy pitch strategy for approaching ${company}.

Company profile:
- Industry: ${intelligence.industry}
- Size: ${intelligence.estimatedSize}
- Current CRM: ${intelligence.currentCRM}
- ICP: ${intelligence.icpTier} (score: ${intelligence.icpScore})
- Pain points: ${intelligence.painPoints.join("; ")}
- Recent triggers: ${intelligence.recentTriggers.join("; ")}

Return ONLY valid JSON:
{"pitchAngle":"core angle in one sentence","openingLine":"opening sentence referencing their specific situation","valueProps":["value prop 1","value prop 2","value prop 3"],"objectionHandling":"how to handle their most likely objection","cta":"specific CTA (e.g. 15-min call to discuss CRM roadmap)"}`;

  const raw = await askAI(prompt, apiKey);
  const r = parseJSON(raw) as Record<string, unknown>;
  return {
    pitchAngle:        String(r.pitchAngle        ?? ""),
    openingLine:       String(r.openingLine       ?? ""),
    valueProps:        Array.isArray(r.valueProps) ? (r.valueProps as unknown[]).map(String) : [],
    objectionHandling: String(r.objectionHandling ?? ""),
    cta:               String(r.cta               ?? ""),
  };
}

export async function generateMessages(
  company: string,
  intelligence: CompanyIntelligence,
  strategy: PitchStrategy,
  messageStyle: string,
  apiKey: string
): Promise<OutreachMessages> {
  const prompt = `Write personalized Salesforce sales outreach messages for ${company}.

Company:
- Industry: ${intelligence.industry} | Size: ${intelligence.estimatedSize}
- Current CRM: ${intelligence.currentCRM}
- Pain points: ${intelligence.painPoints.slice(0, 3).join("; ")}
- Recent triggers: ${intelligence.recentTriggers.slice(0, 2).join("; ")}

Pitch angle: ${strategy.pitchAngle}
Opening line: ${strategy.openingLine}
Value props: ${strategy.valueProps.join(" | ")}
CTA: ${strategy.cta}
${messageStyle ? `\nStyle notes: ${messageStyle}` : ""}

Rules:
- Reference their actual situation — no generic filler
- Sound human, not templated. No "I hope this message finds you well"
- LinkedIn DM: under 300 chars, opener only — no pitch yet
- Cold email: 5-7 sentences, one clear ask
- Follow-up: 3-4 sentences, add a new angle or data point
- Connection note: under 200 chars, genuine reason to connect

Return ONLY valid JSON:
{"linkedinDm":"message","coldEmail":"email body","emailSubject":"subject line","followupEmail":"follow-up body","connectionNote":"connection note"}`;

  const raw = await askAI(prompt, apiKey);
  const r = parseJSON(raw) as Record<string, unknown>;
  return {
    linkedinDm:     String(r.linkedinDm     ?? ""),
    coldEmail:      String(r.coldEmail      ?? ""),
    emailSubject:   String(r.emailSubject   ?? ""),
    followupEmail:  String(r.followupEmail  ?? ""),
    connectionNote: String(r.connectionNote ?? ""),
  };
}

export async function refineMessage(
  message: string,
  type: string,
  instruction: string,
  apiKey: string
): Promise<string> {
  const prompt = `Refine this ${type} outreach message.

Current message:
${message}

Instruction: ${instruction}

Rules:
- Keep company-specific details and personalization
- Apply the instruction faithfully
- Return ONLY the refined message text, no JSON, no explanation, no quotes`;

  return askAI(prompt, apiKey);
}
