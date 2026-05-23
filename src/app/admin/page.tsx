import { requireAdmin } from "@/lib/session";
import { getDataHealth } from "@/lib/data";
import fs from "fs";
import path from "path";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Overview" };

interface CrimesJson {
  generatedAt: string;
  totalRecords: number;
  sourceFiles: number;
  records: { unit?: string; year: number; province: string; canton: string | null }[];
}

function loadCrimes(): CrimesJson | null {
  try {
    const p = path.join(process.cwd(), "public", "data", "crimes.json");
    return JSON.parse(fs.readFileSync(p, "utf-8")) as CrimesJson;
  } catch {
    return null;
  }
}

export default async function AdminPage() {
  await requireAdmin();
  const db     = loadCrimes();
  const health = getDataHealth();
  const errors = health.warnings.filter((w) => w.level === "error");
  const warns  = health.warnings.filter((w) => w.level === "warning");

  const stats = db
    ? {
        total: db.totalRecords,
        sources: db.sourceFiles,
        generated: new Date(db.generatedAt).toLocaleString("es-CR"),
        countRecs: db.records.filter((r) => r.unit === "count" || !r.unit).length,
        rateRecs: db.records.filter((r) => r.unit === "rate_per_10k").length,
        years: [...new Set(db.records.map((r) => r.year))].sort((a, b) => a - b),
        provinces: [...new Set(db.records.map((r) => r.province))].sort(),
        cantons: new Set(db.records.filter((r) => r.canton).map((r) => `${r.province}|${r.canton}`)).size,
      }
    : null;

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold text-white mb-1">Atlas Admin</h1>
      <p className="text-sm text-zinc-400 mb-6">Data management &amp; pipeline controls</p>

      {/* Health banner */}
      {(errors.length > 0 || warns.length > 0) && (
        <a href="/admin/health" className="block mb-6 px-4 py-3 rounded-lg border border-red-800/60 bg-red-950/30 hover:bg-red-950/50 transition-colors">
          <p className="text-sm font-medium text-red-300 mb-1">
            ⚠ {errors.length} error(s), {warns.length} warning(s) detected in data pipeline
          </p>
          <p className="text-xs text-zinc-400">
            {errors[0]?.message ?? warns[0]?.message}
          </p>
          <p className="text-xs text-red-400 mt-1.5">→ View Data Health</p>
        </a>
      )}
      {errors.length === 0 && warns.length === 0 && (
        <a href="/admin/health" className="block mb-6 px-4 py-2.5 rounded-lg border border-emerald-800/40 bg-emerald-950/20 hover:bg-emerald-950/40 transition-colors">
          <p className="text-xs text-emerald-400">✓ Pipeline healthy — no errors or warnings</p>
        </a>
      )}

      {!stats ? (
        <p className="text-red-400 text-sm">crimes.json not found.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
            {[
              { label: "Total records", value: stats.total.toLocaleString() },
              { label: "Rate records", value: stats.rateRecs.toLocaleString() },
              { label: "Count records", value: stats.countRecs.toLocaleString() },
              { label: "Source files", value: stats.sources },
              { label: "Cantons", value: stats.cantons },
              { label: "Year range", value: `${stats.years[0]}–${stats.years[stats.years.length - 1]}` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3">
                <p className="text-xs text-zinc-500 mb-1">{label}</p>
                <p className="text-lg font-mono font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-zinc-500 mb-6">
            Generated: <span className="text-zinc-300">{stats.generated}</span>
            &nbsp;·&nbsp;
            Provinces: <span className="text-zinc-300">{stats.provinces.join(", ")}</span>
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { href: "/admin/pipeline", label: "Run Watchdog / Pipeline", desc: "Validate data and re-import sources", color: "amber" },
              { href: "/admin/records",  label: "Browse Records",           desc: "Search and edit crimes.json records", color: "sky" },
              { href: "/admin/pipeline#deploy", label: "Deploy to Vercel", desc: "Trigger a production redeploy",        color: "emerald" },
            ].map(({ href, label, desc, color }) => (
              <a
                key={href}
                href={href}
                className={`block bg-zinc-900 border border-zinc-700 hover:border-${color}-500 rounded-lg px-4 py-3 transition-colors group`}
              >
                <p className={`text-sm font-medium text-${color}-400 group-hover:text-${color}-300 mb-1`}>{label}</p>
                <p className="text-xs text-zinc-500">{desc}</p>
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
