import Anthropic from "@anthropic-ai/sdk";

const SYSTEM = `You are a lead generation analyst for Foundree42, a US Salesforce implementation and optimization consultancy. \
Your job is to identify companies that would benefit from Salesforce consulting — either new implementations, \
optimizations, migrations from other CRMs, or ongoing managed services. \
The ideal prospect has: a sales or revenue operations team of 5–200 people; is growing (recently funded, hiring, or expanding); \
uses Salesforce poorly or is on a competitor CRM (HubSpot, Microsoft Dynamics, Zoho, Pipedrive); \
has had a recent trigger event (new CRO/VP Sales hire, acquisition, IPO prep, rapid headcount growth, CRM migration project posted). \
Revenue sweet spot: $10M–$3B. Always return valid JSON only. No markdown. No explanation.`;

const SCORING = ` Score 0-100 for Salesforce fit: \
90-100=perfect. 75-89=strong. 60-74=moderate. Below 60=weak. \
Score each company independently.`;

export { SCORING };

export async function askAI(prompt: string, apiKey: string): Promise<string> {
  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 3000,
      system: SYSTEM,
      messages: [{ role: "user", content: prompt }],
    });
    const block = response.content[0];
    return block.type === "text" ? block.text : "";
  } catch (e) {
    console.error("AI request failed:", e);
    throw new Error("AI request failed");
  }
}

export function parseJSON(raw: string): unknown {
  const clean = raw.replace(/```json|```/g, "").trim();
  try { return JSON.parse(clean); } catch { /* fall through */ }
  const arrMatch = clean.match(/\[[\s\S]*\]/);
  if (arrMatch) { try { return JSON.parse(arrMatch[0]); } catch { /* fall through */ } }
  const objMatch = clean.match(/\{[\s\S]*\}/);
  if (objMatch) { try { return JSON.parse(objMatch[0]); } catch { /* fall through */ } }
  return [];
}
