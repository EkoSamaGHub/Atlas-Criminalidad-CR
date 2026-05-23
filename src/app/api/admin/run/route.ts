import { getSession } from "@/lib/session";
import { spawn } from "child_process";
import path from "path";

export const dynamic = "force-dynamic";

const ALLOWED_CMDS: Record<string, { bin: string; args: string[] }> = {
  validate: { bin: "npx", args: ["tsx", "scripts/validate-data.ts"] },
  process:  { bin: "npm",  args: ["run", "process"] },
};

export async function GET(request: Request) {
  const session = await getSession();
  const adminId = process.env.ADMIN_DISCORD_ID;
  if (!session || (adminId && session.discordId !== adminId)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const cmdKey = searchParams.get("cmd") ?? "";
  const cmd = ALLOWED_CMDS[cmdKey];
  if (!cmd) return new Response("Unknown command", { status: 400 });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const proc = spawn(cmd.bin, cmd.args, {
        cwd: path.join(process.cwd()),
        env: { ...process.env, FORCE_COLOR: "0" },
        shell: process.platform === "win32",
      });

      const send = (event: string, data: string) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      proc.stdout.on("data", (chunk: Buffer) => send("out", chunk.toString()));
      proc.stderr.on("data", (chunk: Buffer) => send("out", chunk.toString()));
      proc.on("close", (code: number | null) => {
        send("exit", String(code ?? -1));
        controller.close();
      });
      proc.on("error", (err: Error) => {
        send("out", `Error: ${err.message}\n`);
        send("exit", "-1");
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
