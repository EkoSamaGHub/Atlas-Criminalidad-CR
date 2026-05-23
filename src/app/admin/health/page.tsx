import { requireAdmin } from "@/lib/session";
import { getDataHealth } from "@/lib/data";
import type { Metadata } from "next";
import { AlertTriangle, CheckCircle, Info, XCircle, FileSpreadsheet, FileText, Database } from "lucide-react";

export const metadata: Metadata = { title: "Data Health" };

function WarnRow({ level, message }: { level: "error" | "warning" | "info"; message: string }) {
  const cfg = {
    error:   { bg: "bg-red-950/40 border-red-800/60",    icon: <XCircle size={13} className="text-red-400 shrink-0 mt-0.5" />,      text: "text-red-200" },
    warning: { bg: "bg-amber-950/40 border-amber-800/60", icon: <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />, text: "text-amber-200" },
    info:    { bg: "bg-blue-950/30 border-blue-800/40",   icon: <Info size={13} className="text-blue-400 shrink-0 mt-0.5" />,          text: "text-blue-200" },
  }[level];
  return (
    <div className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border ${cfg.bg}`}>
      {cfg.icon}
      <p className={`text-sm leading-snug ${cfg.text}`}>{message}</p>
    </div>
  );
}

function Section({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="border border-zinc-700 rounded-lg overflow-hidden">
      <div className="bg-zinc-900 px-4 py-2.5 border-b border-zinc-700 flex items-center gap-2 text-sm font-medium text-zinc-200">
        {title}
      </div>
      <div className="p-4 bg-zinc-950">{children}</div>
    </div>
  );
}

function Kv({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2">
      <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-base font-mono font-semibold text-white">{typeof value === "number" ? value.toLocaleString("es-CR") : value}</p>
    </div>
  );
}

export default async function DataHealthPage() {
  await requireAdmin();
  const h = getDataHealth();

  const errors   = h.warnings.filter((w) => w.level === "error");
  const warnings = h.warnings.filter((w) => w.level === "warning");
  const infos    = h.warnings.filter((w) => w.level === "info");
  const totalPdfRecords = h.pdf.extracted.reduce((s, f) => s + f.records, 0);

  return (
    <div className="max-w-4xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-white mb-1">Data Health</h1>
        <p className="text-sm text-zinc-400">
          Pipeline status · checked at {new Date(h.checkedAt).toLocaleString("es-CR")}
        </p>
      </div>

      {/* Alerts */}
      {h.warnings.length === 0 ? (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-emerald-800/60 bg-emerald-950/30">
          <CheckCircle size={14} className="text-emerald-400" />
          <p className="text-sm text-emerald-300">All checks passed — no issues detected.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {errors.map((w, i)   => <WarnRow key={i} level="error"   message={w.message} />)}
          {warnings.map((w, i) => <WarnRow key={i} level="warning" message={w.message} />)}
          {infos.map((w, i)    => <WarnRow key={i} level="info"    message={w.message} />)}
        </div>
      )}

      {/* crimes.json */}
      <Section title={<><Database size={13} /> crimes.json</>}>
        {!h.crimesJson.exists ? (
          <p className="text-sm text-red-400">File not found. Run <code className="bg-zinc-800 px-1 rounded text-xs">npm run process</code>.</p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Kv label="Total records" value={h.crimesJson.totalRecords} />
              <Kv label="Sources" value={h.crimesJson.sources} />
              <Kv label="Year range" value={h.crimesJson.yearRange ? `${h.crimesJson.yearRange[0]}–${h.crimesJson.yearRange[1]}` : "—"} />
              <Kv label="Generated" value={h.crimesJson.generatedAt ? new Date(h.crimesJson.generatedAt).toLocaleDateString("es-CR") : "—"} />
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1.5">Unit breakdown</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(h.crimesJson.byUnit).map(([unit, count]) => (
                  <span key={unit} className={`text-xs font-mono px-2.5 py-1 rounded border ${unit === "count" ? "border-red-800 bg-red-950/40 text-red-300" : "border-emerald-800 bg-emerald-950/30 text-emerald-300"}`}>
                    {unit}: {count.toLocaleString()}
                    {unit === "count" && " ⚠ PDF leak"}
                  </span>
                ))}
              </div>
              {h.pdf.inCrimesJson === 0 && (
                <p className="text-xs text-emerald-400 mt-1.5 flex items-center gap-1"><CheckCircle size={11} /> No PDF records in crimes.json — dashboards are Excel-only</p>
              )}
            </div>
          </div>
        )}
      </Section>

      {/* Excel pipeline */}
      <Section title={<><FileSpreadsheet size={13} /> Excel pipeline (rate_per_10k)</>}>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <Kv label="In manifest" value={h.excel.manifestTotal} />
          <Kv label="Raw files found" value={h.excel.rawFilesFound} />
          <Kv label="Years in crimes.json" value={h.excel.yearsInCrimesJson.join(", ") || "—"} />
        </div>
        {h.excel.rawFilesMissing.length > 0 ? (
          <div>
            <p className="text-xs text-amber-400 mb-2 flex items-center gap-1"><AlertTriangle size={11} /> {h.excel.rawFilesMissing.length} Excel file(s) in manifest but missing from raw/</p>
            <div className="rounded border border-zinc-700 overflow-hidden">
              <table className="w-full text-xs">
                <thead><tr className="bg-zinc-900 text-zinc-500"><th className="text-left px-3 py-2">Title</th><th className="text-left px-3 py-2 w-14">Year</th><th className="text-left px-3 py-2">Filename</th></tr></thead>
                <tbody className="divide-y divide-zinc-800">
                  {h.excel.rawFilesMissing.map((f) => (
                    <tr key={f.filename} className="text-zinc-400">
                      <td className="px-3 py-1.5">{f.title}</td>
                      <td className="px-3 py-1.5 tabular-nums">{f.year ?? "—"}</td>
                      <td className="px-3 py-1.5 font-mono text-zinc-500 text-[11px]">{f.filename}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-zinc-500 mt-1.5">Run <code className="bg-zinc-800 px-1 rounded">npm run scrape</code> to download missing files.</p>
          </div>
        ) : (
          <p className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle size={11} /> All Excel manifest entries have raw JSON files</p>
        )}
      </Section>

      {/* PDF pipeline */}
      <Section title={<><FileText size={13} /> PDF pipeline (count — shown on /pdfs only)</>}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          <Kv label="In manifest" value={h.pdf.manifestTotal} />
          <Kv label="Extracted" value={h.pdf.extracted.length} />
          <Kv label="Not extracted" value={h.pdf.notExtracted.length} />
          <Kv label="Total PDF records" value={totalPdfRecords} />
        </div>

        {h.pdf.extracted.length > 0 && (
          <div className="mb-3">
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1.5">Extracted files ({h.pdf.extracted.length})</p>
            <div className="rounded border border-zinc-700 overflow-hidden">
              <table className="w-full text-xs">
                <thead><tr className="bg-zinc-900 text-zinc-500"><th className="text-left px-3 py-2">File</th><th className="text-right px-3 py-2">Records</th><th className="text-left px-3 py-2">Years</th><th className="text-right px-3 py-2">Status</th></tr></thead>
                <tbody className="divide-y divide-zinc-800">
                  {h.pdf.extracted.map((f) => (
                    <tr key={f.filename} className="text-zinc-400">
                      <td className="px-3 py-1.5 font-mono text-[11px]">{f.filename}</td>
                      <td className="px-3 py-1.5 tabular-nums text-right">{f.records.toLocaleString()}</td>
                      <td className="px-3 py-1.5">{f.years.join(", ")}</td>
                      <td className="px-3 py-1.5 text-right font-medium">{f.records === 0 ? <span className="text-red-400">EMPTY</span> : <span className="text-emerald-400">OK</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-blue-400 mt-1.5">Records are in <code className="bg-zinc-800 px-1 rounded text-[11px]">public/data/raw/*_pdf.json</code> — visible at <a href="/pdfs" className="underline hover:text-blue-300">/pdfs</a>, NOT in dashboards.</p>
          </div>
        )}

        {h.pdf.notExtracted.length > 0 && (
          <div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1.5">Not yet extracted ({h.pdf.notExtracted.length}) — informational only</p>
            <div className="max-h-44 overflow-y-auto rounded border border-zinc-700">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-zinc-900"><tr className="text-zinc-500"><th className="text-left px-3 py-2">Title</th><th className="text-left px-3 py-2 w-14">Year</th></tr></thead>
                <tbody className="divide-y divide-zinc-800">
                  {h.pdf.notExtracted.map((f) => (
                    <tr key={f.filename} className="text-zinc-500">
                      <td className="px-3 py-1.5 leading-snug">{f.title}</td>
                      <td className="px-3 py-1.5 tabular-nums">{f.year ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}
