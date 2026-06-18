import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/crypto";

const ALL_KEYS = ["anthropic", "apollo", "tavily", "sf_instance_url", "sf_client_id", "sf_client_secret", "sf_username", "sf_password"] as const;

export async function GET() {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const rows = await prisma.config.findMany({ where: { key: { in: [...ALL_KEYS] } } });
  const map = Object.fromEntries(rows.map((r) => [r.key, !!r.value]));
  const salesforceActive = ["sf_instance_url", "sf_client_id", "sf_client_secret", "sf_username", "sf_password"].every((k) => map[k]);
  return NextResponse.json({ ...map, salesforce: salesforceActive });
}

export async function POST(req: Request) {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await req.json() as Partial<Record<typeof ALL_KEYS[number], string>>;
  for (const key of ALL_KEYS) {
    const val = body[key];
    if (val) {
      if (val.length > 500) return NextResponse.json({ error: `${key} value is too long.` }, { status: 400 });
      const enc = encrypt(val);
      await prisma.config.upsert({ where: { key }, update: { value: enc }, create: { key, value: enc } });
    }
  }
  return NextResponse.json({ ok: true });
}
