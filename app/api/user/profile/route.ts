import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, email: true, name: true,
      avatarUrl: true, timezone: true, theme: true,
      notifPrefs: true, role: true, weeklyGoal: true,
      sfAccessToken: true, sfInstanceUrl: true,
    },
  });
  if (!user) return NextResponse.json({ error: "Not found." }, { status: 404 });

  return NextResponse.json({
    ...user,
    sfConnected: !!user.sfAccessToken,
    sfAccessToken: undefined,
  });
}

export async function PATCH(req: Request) {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await req.json() as {
    name?: string;
    timezone?: string;
    theme?: string;
    notifPrefs?: object;
    weeklyGoal?: number;
  };

  const data: Record<string, unknown> = {};
  if (body.name        !== undefined) data.name        = body.name;
  if (body.timezone    !== undefined) data.timezone    = body.timezone;
  if (body.theme       !== undefined) data.theme       = body.theme;
  if (body.notifPrefs  !== undefined) data.notifPrefs  = body.notifPrefs;
  if (body.weeklyGoal  !== undefined) data.weeklyGoal  = body.weeklyGoal;

  const updated = await prisma.user.update({ where: { id: userId }, data });
  return NextResponse.json({ success: true, name: updated.name, timezone: updated.timezone, theme: updated.theme, weeklyGoal: updated.weeklyGoal });
}
