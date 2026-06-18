import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { gatherSignals, analyzeCompany, buildPitchStrategy, generateMessages } from "@/lib/outreach";
import { decrypt } from "@/lib/crypto";

export async function POST(req: Request) {
  try {
    const userId = await getSession();
    if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const body = await req.json() as {
      company: string;
      messageStyle?: string;
      industry?: string;
      employees?: string;
      trigger?: string;
      technologies?: string[];
    };

    const { company, messageStyle = "", industry, employees, trigger, technologies } = body;

    if (!company || typeof company !== "string" || company.trim().length === 0) {
      return NextResponse.json({ error: "Company name is required." }, { status: 400 });
    }
    if (company.length > 200) {
      return NextResponse.json({ error: "Company name too long (max 200 chars)." }, { status: 400 });
    }
    if (technologies && (!Array.isArray(technologies) || technologies.length > 20)) {
      return NextResponse.json({ error: "Technologies must be an array of max 20 items." }, { status: 400 });
    }

    const rows = await prisma.config.findMany({ where: { key: { in: ["anthropic", "tavily"] } } });
    const config = Object.fromEntries(rows.map((r) => [r.key, decrypt(r.value)]));
    const anthropicKey = config.anthropic ?? "";
    const tavilyKey    = config.tavily    ?? "";
    if (!anthropicKey) return NextResponse.json({ error: "Anthropic API key not configured." }, { status: 400 });

    const signals = tavilyKey
      ? await gatherSignals(company, tavilyKey)
      : "No web search available — Tavily key not configured.";

    const intelligence = await analyzeCompany(company, signals, { industry, employees, trigger, technologies }, anthropicKey);
    const strategy     = await buildPitchStrategy(company, intelligence, anthropicKey);
    const messages     = await generateMessages(company, intelligence, strategy, messageStyle, anthropicKey);

    return NextResponse.json({ intelligence, strategy, messages });
  } catch (e) {
    console.error("Outreach research error:", e);
    return NextResponse.json({ error: "Research failed. Check server logs." }, { status: 500 });
  }
}
