import { notFound } from "next/navigation";
import Link from "next/link";
import { getAllRecords, getStats, getDistrictRankings, PROVINCE_META, CRIME_COLORS } from "@/lib/data";
import type { CrimeRecord } from "@/lib/data";

// Slug → canonical province name
const SLUG_MAP: Record<string, string> = {
  "san-jose":   "San José",
  alajuela:     "Alajuela",
  cartago:      "Cartago",
  heredia:      "Heredia",
  guanacaste:   "Guanacaste",
  puntarenas:   "Puntarenas",
  limon:        "Limón",
};

export function generateStaticParams() {
  return Object.keys(SLUG_MAP).map((name) => ({ name }));
}

type Params = Promise<{ name: string }>;

export default async function ProvinciaPage({ params }: { params: Params }) {
  const { name } = await params;
  const province = SLUG_MAP[name];
  if (!province) notFound();

  const meta = PROVINCE_META[province];
  const allRecords = getAllRecords();
  const stats = getStats();
  const districtRankings = getDistrictRankings(province);

  const provRecords = allRecords.filter((r) => r.province === province);
  const countRecords = provRecords.filter((r) => r.unit === "count" || r.unit === undefined);
  const rateRecords  = provRecords.filter((r) => r.unit === "rate_per_10k");

  // Years and crime types
  const years = [...new Set(provRecords.map((r) => r.year))].sort((a, b) => b - a);
  const crimeTypes = [...new Set(provRecords.map((r) => r.crimeType))].sort();

  // Province-level annual summary by year (count records preferred)
  const annualByYear = new Map<number, Record<string, number>>();
  const workingRecs = countRecords.length > 0 ? countRecords : rateRecords;

  for (const r of workingRecs.filter((r) => r.period === "Anual" && !r.canton)) {
    if (!annualByYear.has(r.year)) annualByYear.set(r.year, {});
    const entry = annualByYear.get(r.year)!;
    entry[r.crimeType] = (entry[r.crimeType] ?? 0) + r.count;
  }
  const annualYears = [...annualByYear.keys()].sort((a, b) => b - a);

  // Canton-level summary (all years combined)
  const cantonMap = new Map<string, Record<string, number>>();
  for (const r of workingRecs.filter((r) => r.canton)) {
    const key = r.canton!;
    if (!cantonMap.has(key)) cantonMap.set(key, {});
    const entry = cantonMap.get(key)!;
    entry[r.crimeType] = (entry[r.crimeType] ?? 0) + r.count;
  }
  const cantons = [...cantonMap.entries()]
    .map(([canton, crimes]) => ({
      canton,
      crimes,
      total: Object.values(crimes).reduce((s, v) => s + v, 0),
    }))
    .sort((a, b) => b.total - a.total);

  // National comparison (latest year with count data)
  const nationRecords = allRecords.filter(
    (r) => r.unit === "count" && r.period === "Anual" && !r.canton
  );
  const nationYears = [...new Set(nationRecords.map((r) => r.year))].sort((a, b) => b - a);
  const latestNationYear = nationYears[0];
  const nationTotals: Record<string, number> = {};
  for (const r of nationRecords.filter((r) => r.year === latestNationYear)) {
    nationTotals[r.crimeType] = (nationTotals[r.crimeType] ?? 0) + r.count;
  }

  // Latest year for province
  const latestAnnual = annualYears[0];
  const latestData = annualByYear.get(latestAnnual) ?? {};
  const latestTotal = Object.values(latestData).reduce((s, v) => s + v, 0);
  const ratePerHundred = meta ? parseFloat(((latestTotal / meta.population) * 100000).toFixed(1)) : 0;

  // Periods available
  const periods = [...new Set(provRecords.map((r) => r.period))].sort();
  const hasSemestreData = periods.some((p) => p.includes("Semestre"));

  const isRateData = countRecords.length === 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/" className="hover:text-slate-300">Inicio</Link>
        <span>›</span>
        <Link href="/atlas" className="hover:text-slate-300">Atlas</Link>
        <span>›</span>
        <span className="text-slate-300">{province}</span>
      </nav>

      {/* Header */}
      <div className="border-b border-slate-800 pb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white mb-1">Provincia de {province}</h1>
            <p className="text-slate-400 text-sm">
              {meta?.population.toLocaleString("es-CR")} habitantes ·{" "}
              {cantons.length} cantones con datos ·{" "}
              {districtRankings.length > 0 && <>{districtRankings.length} distritos · </>}
              {years.length} años de cobertura ({years.at(-1)}–{years[0]})
            </p>
            {isRateData && (
              <p className="text-amber-400/80 text-xs mt-1 bg-amber-950/30 border border-amber-900/50 rounded px-2 py-1 inline-block">
                Datos en tasas por 10,000 hab. (Excel OIJ 2018-2022)
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <Link href={`/atlas`} className="btn-outline text-sm">← Volver al mapa</Link>
          </div>
        </div>
      </div>

      {/* KPI strip — latest year */}
      {latestAnnual && (
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-3">
            {isRateData ? "Tasas por 10k hab." : "Delitos registrados"} · {latestAnnual} (anual)
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {crimeTypes.map((ct) => {
              const val = latestData[ct] ?? 0;
              const natVal = nationTotals[ct] ?? 1;
              const share = natVal > 0 ? ((val / natVal) * 100).toFixed(1) : "—";
              return (
                <div key={ct} className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 capitalize">{ct}</p>
                  <p className="text-lg font-bold tabular-nums" style={{ color: CRIME_COLORS[ct] ?? "#fff" }}>
                    {val.toLocaleString("es-CR")}
                  </p>
                  {!isRateData && natVal > 0 && (
                    <p className="text-[10px] text-slate-600 mt-0.5">{share}% del país</p>
                  )}
                </div>
              );
            })}
            {latestTotal > 0 && (
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Total</p>
                <p className="text-lg font-bold text-white tabular-nums">{latestTotal.toLocaleString("es-CR")}</p>
                {meta && !isRateData && (
                  <p className="text-[10px] text-slate-500 mt-0.5">{ratePerHundred} / 100k hab.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Year-by-year trend table */}
      {annualYears.length > 1 && (
        <div>
          <h2 className="text-base font-semibold text-white mb-3">Evolución Anual</h2>
          <div className="rounded-xl border border-slate-800 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-800/60 text-slate-400 text-left sticky top-0">
                <tr>
                  <th className="px-4 py-3 font-medium">Año</th>
                  {crimeTypes.map((ct) => (
                    <th key={ct} className="px-3 py-3 font-medium capitalize text-center text-xs"
                      style={{ color: CRIME_COLORS[ct] ?? "#94a3b8" }}>{ct}</th>
                  ))}
                  <th className="px-4 py-3 font-medium text-right">Total</th>
                  {!isRateData && meta && <th className="px-4 py-3 font-medium text-right">/ 100k</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {annualYears.map((yr) => {
                  const row = annualByYear.get(yr) ?? {};
                  const total = Object.values(row).reduce((s, v) => s + v, 0);
                  const rate = meta && !isRateData ? parseFloat(((total / meta.population) * 100000).toFixed(1)) : null;
                  const prevYr = annualYears[annualYears.indexOf(yr) + 1];
                  const prevTotal = prevYr ? Object.values(annualByYear.get(prevYr) ?? {}).reduce((s, v) => s + v, 0) : null;
                  const change = prevTotal ? ((total - prevTotal) / prevTotal * 100).toFixed(1) : null;
                  return (
                    <tr key={yr} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-2.5 font-semibold text-white">
                        {yr}
                        {change && (
                          <span className={`ml-2 text-xs ${parseFloat(change) > 0 ? "text-red-400" : "text-emerald-400"}`}>
                            {parseFloat(change) > 0 ? "▲" : "▼"}{Math.abs(parseFloat(change))}%
                          </span>
                        )}
                      </td>
                      {crimeTypes.map((ct) => (
                        <td key={ct} className="px-3 py-2.5 text-slate-300 text-center text-xs tabular-nums">
                          {(row[ct] ?? 0) > 0 ? (row[ct] ?? 0).toLocaleString("es-CR") : <span className="text-slate-700">—</span>}
                        </td>
                      ))}
                      <td className="px-4 py-2.5 text-right font-bold text-white tabular-nums">{total.toLocaleString("es-CR")}</td>
                      {!isRateData && meta && (
                        <td className="px-4 py-2.5 text-right text-slate-400 text-xs tabular-nums">{rate}</td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mini bar chart — crime type breakdown */}
      {latestTotal > 0 && (
        <div>
          <h2 className="text-base font-semibold text-white mb-3">Composición por Tipo de Delito · {latestAnnual}</h2>
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-3">
            {crimeTypes
              .map((ct) => ({ ct, val: latestData[ct] ?? 0 }))
              .sort((a, b) => b.val - a.val)
              .map(({ ct, val }) => {
                const pct = latestTotal > 0 ? (val / latestTotal) * 100 : 0;
                return (
                  <div key={ct} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="capitalize font-medium" style={{ color: CRIME_COLORS[ct] ?? "#94a3b8" }}>{ct}</span>
                      <span className="text-slate-300 tabular-nums">{val.toLocaleString("es-CR")} ({pct.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${Math.max(pct, 0.5)}%`, background: CRIME_COLORS[ct] ?? "#64748b" }} />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Canton table */}
      {cantons.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-white mb-3">Cantones ({cantons.length})</h2>
          <div className="rounded-xl border border-slate-800 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-800/60 text-slate-400 text-left sticky top-0">
                <tr>
                  <th className="px-3 py-3 font-medium w-8">#</th>
                  <th className="px-4 py-3 font-medium">Cantón</th>
                  {crimeTypes.map((ct) => (
                    <th key={ct} className="px-3 py-3 font-medium text-center text-xs capitalize"
                      style={{ color: CRIME_COLORS[ct] ?? "#94a3b8" }}>{ct}</th>
                  ))}
                  <th className="px-4 py-3 font-medium text-right">Total</th>
                  <th className="px-4 py-3 font-medium">Barra</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {cantons.map((c, i) => (
                  <tr key={c.canton} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-3 py-2 text-slate-600 text-xs tabular-nums">{i + 1}</td>
                    <td className="px-4 py-2 font-medium text-white">{c.canton}</td>
                    {crimeTypes.map((ct) => (
                      <td key={ct} className="px-3 py-2 text-center text-xs tabular-nums text-slate-300">
                        {(c.crimes[ct] ?? 0) > 0
                          ? (c.crimes[ct] ?? 0).toLocaleString("es-CR")
                          : <span className="text-slate-700">—</span>}
                      </td>
                    ))}
                    <td className="px-4 py-2 text-right font-bold text-white tabular-nums">
                      {c.total.toLocaleString("es-CR")}
                    </td>
                    <td className="px-4 py-2">
                      <div className="w-24 h-1.5 rounded-full bg-slate-800">
                        <div className="h-full rounded-full bg-red-500/70"
                          style={{ width: `${(c.total / (cantons[0]?.total ?? 1)) * 100}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* District breakdown table */}
      {districtRankings.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-white">
              Distritos ({districtRankings.length})
            </h2>
            <span className="text-xs text-amber-400/70 border border-amber-900/40 bg-amber-950/20 rounded px-2 py-0.5">
              Tasas /10k hab. · 2018–2022
            </span>
          </div>
          <div className="rounded-xl border border-slate-800 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-800/60 text-slate-400 text-left sticky top-0">
                <tr>
                  <th className="px-3 py-3 font-medium w-8">#</th>
                  <th className="px-4 py-3 font-medium">Cantón</th>
                  <th className="px-4 py-3 font-medium">Distrito</th>
                  {crimeTypes.map((ct) => (
                    <th key={ct} className="px-3 py-3 font-medium text-center text-xs capitalize"
                      style={{ color: CRIME_COLORS[ct] ?? "#94a3b8" }}>{ct}</th>
                  ))}
                  <th className="px-4 py-3 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {districtRankings.map((d, i) => (
                  <tr key={`${d.canton}-${d.district}`} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-3 py-2 text-slate-600 text-xs tabular-nums">{i + 1}</td>
                    <td className="px-4 py-2 text-slate-400 text-xs">{d.canton}</td>
                    <td className="px-4 py-2 font-medium text-white text-sm">{d.district}</td>
                    {crimeTypes.map((ct) => (
                      <td key={ct} className="px-3 py-2 text-center text-xs tabular-nums text-slate-300">
                        {(d.crimes[ct] ?? 0) > 0
                          ? (d.crimes[ct] ?? 0).toLocaleString("es-CR")
                          : <span className="text-slate-700">—</span>}
                      </td>
                    ))}
                    <td className="px-4 py-2 text-right font-bold text-white tabular-nums text-xs">
                      {d.total.toLocaleString("es-CR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Datos de Anexos Estadísticos Excel OIJ/MSP (2018–2022) · tasas por 10,000 habitantes.
            Suma de todos los años disponibles por distrito.
          </p>
        </div>
      )}

      {/* All periods available */}
      {hasSemestreData && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Períodos con datos disponibles</h3>
          <div className="flex flex-wrap gap-2">
            {periods.map((p) => (
              <span key={p} className="px-2.5 py-1 rounded-full text-xs border border-slate-700 text-slate-400 bg-slate-800/50">{p}</span>
            ))}
          </div>
        </div>
      )}

      {/* Navigation to other provinces */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Otras provincias</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(SLUG_MAP)
            .filter(([, pName]) => pName !== province)
            .map(([slug, pName]) => (
              <Link key={slug} href={`/provincias/${slug}`}
                className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-400 hover:text-white hover:border-slate-500 transition-colors">
                {pName}
              </Link>
            ))}
        </div>
      </div>

      <p className="text-xs text-slate-600">
        Fuente: Observatorio de la Violencia, Ministerio de Justicia y Paz de Costa Rica ·{" "}
        {stats.sourceFiles} publicaciones procesadas ·{" "}
        {stats.generatedAt ? new Date(stats.generatedAt).toLocaleDateString("es-CR") : ""}
      </p>
    </div>
  );
}
