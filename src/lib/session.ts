import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? "dev-secret-please-set-SESSION_SECRET-in-env"
);

const COOKIE = "admin_session";

export async function createSession(discordId: string, username: string) {
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const token = await new SignJWT({ discordId, username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires,
    sameSite: "lax",
    path: "/",
  });
}

export async function deleteSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export const getSession = cache(async () => {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET, { algorithms: ["HS256"] });
    return payload as { discordId: string; username: string };
  } catch {
    return null;
  }
});

export const requireAdmin = cache(async () => {
  const session = await getSession();
  if (!session) redirect("/api/auth/discord");
  const adminId = process.env.ADMIN_DISCORD_ID;
  if (adminId && session.discordId !== adminId) redirect("/");
  return session;
});
