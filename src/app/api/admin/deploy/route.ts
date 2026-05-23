import { getSession } from "@/lib/session";

export async function POST() {
  const session = await getSession();
  const adminId = process.env.ADMIN_DISCORD_ID;
  if (!session || (adminId && session.discordId !== adminId)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const hookUrl = process.env.VERCEL_DEPLOY_HOOK_URL;
  if (!hookUrl) {
    return Response.json({ error: "VERCEL_DEPLOY_HOOK_URL not set" }, { status: 500 });
  }

  const res = await fetch(hookUrl, { method: "POST" });
  if (!res.ok) {
    return Response.json({ error: `Deploy hook failed: ${res.status}` }, { status: 502 });
  }

  const body = await res.json() as { job?: { id?: string } };
  return Response.json({ ok: true, jobId: body?.job?.id ?? null });
}
