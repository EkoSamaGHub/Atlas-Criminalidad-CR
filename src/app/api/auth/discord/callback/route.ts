import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const storedState = request.cookies.get("discord_state")?.value;

  if (!code || !state || state !== storedState) {
    return NextResponse.redirect(new URL("/?error=auth_failed", request.url));
  }

  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID!,
      client_secret: process.env.DISCORD_CLIENT_SECRET!,
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.DISCORD_REDIRECT_URI!,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL("/?error=token_failed", request.url));
  }

  const { access_token } = await tokenRes.json() as { access_token: string };

  const userRes = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  if (!userRes.ok) {
    return NextResponse.redirect(new URL("/?error=user_failed", request.url));
  }

  const user = await userRes.json() as { id: string; username: string };

  const adminId = process.env.ADMIN_DISCORD_ID;
  if (adminId && user.id !== adminId) {
    return NextResponse.redirect(new URL("/?error=unauthorized", request.url));
  }

  await createSession(user.id, user.username);

  const response = NextResponse.redirect(new URL("/admin", request.url));
  response.cookies.delete("discord_state");
  return response;
}
