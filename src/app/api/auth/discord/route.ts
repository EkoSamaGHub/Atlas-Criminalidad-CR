export async function GET() {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return new Response("DISCORD_CLIENT_ID / DISCORD_REDIRECT_URI not set", { status: 500 });
  }

  const state = crypto.randomUUID();
  const url = new URL("https://discord.com/api/oauth2/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "identify");
  url.searchParams.set("state", state);

  const res = new Response(null, { status: 302, headers: { Location: url.toString() } });
  res.headers.append(
    "Set-Cookie",
    `discord_state=${state}; HttpOnly; SameSite=Lax; Path=/; Max-Age=300`
  );
  return res;
}
