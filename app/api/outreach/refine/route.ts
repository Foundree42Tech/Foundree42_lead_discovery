import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { refineMessage } from "@/lib/outreach";
import { decrypt } from "@/lib/crypto";

export async function POST(req: Request) {
  try {
    const userId = await getSession();
    if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const { message, type, instruction } = await req.json() as {
      message: string;
      type: string;
      instruction: string;
    };

    const row = await prisma.config.findUnique({ where: { key: "anthropic" } });
    const apiKey = row?.value ? decrypt(row.value) : "";
    if (!apiKey) return NextResponse.json({ error: "Anthropic API key not configured." }, { status: 400 });

    const refined = await refineMessage(message, type, instruction, apiKey);
    return NextResponse.json({ message: refined });
  } catch (e) {
    console.error("Refine error:", e);
    return NextResponse.json({ error: "Refinement failed." }, { status: 500 });
  }
}
