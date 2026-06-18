import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const SF_CLIENT_ID   = process.env.SF_CLIENT_ID   ?? "";
const SF_CLIENT_SECRET = process.env.SF_CLIENT_SECRET ?? "";
const SF_CALLBACK_URL  = process.env.SF_CALLBACK_URL  ?? "http://localhost:3000/api/auth/salesforce/callback";

// GET — initiate OAuth flow
export async function GET() {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const state = randomBytes(16).toString("hex");
  const store = await cookies();
  store.set("sf_state", state, { httpOnly: true, maxAge: 300, path: "/" });

  const params = new URLSearchParams({
    response_type: "code",
    client_id:     SF_CLIENT_ID,
    redirect_uri:  SF_CALLBACK_URL,
    state,
    scope:         "api refresh_token offline_access",
    // Force an explicit Salesforce login + approval for THIS user, rather than
    // silently reusing an existing browser session / prior consent. This makes
    // each user authorize their own org connection.
    prompt:        "login consent",
  });

  const loginHost = process.env.SF_LOGIN_URL ?? "https://login.salesforce.com";
  return NextResponse.redirect(`${loginHost}/services/oauth2/authorize?${params}`);
}

// DELETE — disconnect Salesforce
export async function DELETE() {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  await prisma.user.update({
    where: { id: userId },
    data: {
      sfAccessToken:  null,
      sfRefreshToken: null,
      sfInstanceUrl:  null,
      sfTokenExpiry:  null,
    },
  });

  return NextResponse.json({ ok: true });
}
