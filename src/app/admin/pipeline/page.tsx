"use client";

import { useCallback, useRef, useState } from "react";

type Line = { text: string; kind: "out" | "err" | "meta" };

function Terminal({ lines }: { lines: Line[] }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      className="bg-black rounded-lg border border-zinc-700 p-4 font-mono text-xs text-green-300 h-96 overflow-y-auto whitespace-pre-wrap leading-5"
    >
      {lines.length === 0 ? (
        <span className="text-zinc-600">Output will appear here…</span>
      ) : (
        lines.map((l, i) => (
          <span
            key={i}
            className={
              l.kind === "err" ? "text-red-400" :
              l.kind === "meta" ? "text-amber-400" :
              "text-green-300"
            }
          >
            {l.text}
          </span>
        ))
      )}
    </div>
  );
}

function RunButton({
  label,
  cmd,
  running,
  onStart,
  onDone,
  onLine,
}: {
  label: string;
  cmd: string;
  running: boolean;
  onStart: () => void;
  onDone: (code: string) => void;
  onLine: (l: Line) => void;
}) {
  const run = useCallback(() => {
    onStart();
    onLine({ text: `$ ${label}\n`, kind: "meta" });
    const es = new EventSource(`/api/admin/run?cmd=${cmd}`);
    es.addEventListener("out", (e) => {
      onLine({ text: JSON.parse(e.data) as string, kind: "out" });
    });
    es.addEventListener("exit", (e) => {
      const code = JSON.parse(e.data) as string;
      onLine({ text: `\n[exit ${code}]\n`, kind: code === "0" ? "meta" : "err" });
      onDone(code);
      es.close();
    });
    es.onerror = () => {
      onLine({ text: "\n[connection error]\n", kind: "err" });
      onDone("-1");
      es.close();
    };
  }, [cmd, label, onStart, onDone, onLine]);

  return (
    <button
      onClick={run}
      disabled={running}
      className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors bg-amber-500 hover:bg-amber-400 text-black"
    >
      {running ? "Running…" : label}
    </button>
  );
}

export default function PipelinePage() {
  const [lines, setLines]     = useState<Line[]>([]);
  const [running, setRunning] = useState(false);
  const [deployStatus, setDeployStatus] = useState<string | null>(null);
  const [deploying, setDeploying] = useState(false);

  const addLine = useCallback((l: Line) => setLines((prev) => [...prev, l]), []);
  const onStart = useCallback(() => { setLines([]); setRunning(true); }, []);
  const onDone  = useCallback(() => setRunning(false), []);

  const deploy = async () => {
    setDeploying(true);
    setDeployStatus(null);
    try {
      const res = await fetch("/api/admin/deploy", { method: "POST" });
      const body = await res.json() as { ok?: boolean; jobId?: string; error?: string };
      if (body.ok) {
        setDeployStatus(`Deploy triggered${body.jobId ? ` · job ${body.jobId}` : ""}`);
      } else {
        setDeployStatus(`Error: ${body.error ?? "unknown"}`);
      }
    } catch {
      setDeployStatus("Network error");
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold text-white mb-1">Pipeline</h1>
      <p className="text-sm text-zinc-400 mb-6">
        Run the data watchdog or re-import sources. Output streams live.
      </p>

      <div className="flex flex-wrap gap-3 mb-4">
        <RunButton
          label="Run Watchdog"
          cmd="validate"
          running={running}
          onStart={onStart}
          onDone={onDone}
          onLine={addLine}
        />
        <RunButton
          label="Run Process (re-import Excel)"
          cmd="process"
          running={running}
          onStart={onStart}
          onDone={onDone}
          onLine={addLine}
        />
      </div>

      <Terminal lines={lines} />

      {/* Deploy section */}
      <div id="deploy" className="mt-8 border-t border-zinc-700 pt-6">
        <h2 className="text-base font-semibold text-white mb-1">Deploy to Vercel</h2>
        <p className="text-sm text-zinc-400 mb-4">
          Triggers a production redeploy via the Vercel deploy hook.
          Requires <code className="text-amber-400">VERCEL_DEPLOY_HOOK_URL</code> env var.
        </p>
        <button
          onClick={deploy}
          disabled={deploying}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {deploying ? "Deploying…" : "Trigger Deploy"}
        </button>
        {deployStatus && (
          <p className={`mt-3 text-sm font-mono ${deployStatus.startsWith("Error") || deployStatus.startsWith("Network") ? "text-red-400" : "text-emerald-400"}`}>
            {deployStatus}
          </p>
        )}
      </div>
    </div>
  );
}
