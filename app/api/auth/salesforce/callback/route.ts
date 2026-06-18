import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/crypto";

const SF_CLIENT_ID     = process.env.SF_CLIENT_ID     ?? "";
const SF_CLIENT_SECRET = process.env.SF_CLIENT_SECRET ?? "";
const SF_CALLBACK_URL  = process.env.SF_CALLBACK_URL  ?? "http://localhost:3000/api/auth/salesforce/callback";

export async function GET(req: NextRequest) {
  const userId = await getSession();
  if (!userId) return NextResponse.redirect(new URL("/sign-in", req.url));

  const { searchParams } = new URL(req.url);
  const code  = searchParams.get("code");
  const state = searchParams.get("state");

  const store        = await cookies();
  const expectedState = store.get("sf_state")?.value;

  if (!code || !state || state !== expectedState) {
    store.delete("sf_state");
    return NextResponse.redirect(new URL("/?sf_error=invalid_state", req.url));
  }

  store.delete("sf_state");

  // Exchange code for tokens — must use the same host as the authorize request
  const loginHost = process.env.SF_LOGIN_URL ?? "https://login.salesforce.com";
  const tokenRes = await fetch(`${loginHost}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type:    "authorization_code",
      client_id:     SF_CLIENT_ID,
      client_secret: SF_CLIENT_SECRET,
      redirect_uri:  SF_CALLBACK_URL,
      code,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL("/?sf_error=token_exchange_failed", req.url));
  }

  const { access_token, refresh_token, instance_url } = await tokenRes.json() as {
    access_token: string;
    refresh_token: string;
    instance_url: string;
  };

  await prisma.user.update({
    where: { id: userId },
    data: {
      sfAccessToken:  encrypt(access_token),
      sfRefreshToken: encrypt(refresh_token),
      sfInstanceUrl:  instance_url,
      sfTokenExpiry:  new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
    },
  });

  return NextResponse.redirect(new URL("/", req.url));
}
