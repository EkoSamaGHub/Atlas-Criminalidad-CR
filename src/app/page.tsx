import Link from "next/link";
import { Calendar, MapPin, Home, Map, Database, BarChart3, Search, TrendingDown, TrendingUp, Minus, ArrowRight } from "lucide-react";
import { getStats, getProvinces, getCrimeTotals, getYearTrend, getProvinceCountSummary, PROVINCE_META, CATEGORIES, provinceSlug } from "@/lib/data";
import { AnimatedKpiCard } from "@/components/AnimatedKpi";

export default function HomePage() {
  const stats            = getStats();
  const { provinces, isReal } = getProvinces();
  const crimeTotals      = getCrimeTotals();
  const trend            = getYearTrend();
  const countSummary     = getProvinceCountSummary();

  const sorted           = [...provinces].sort((a, b) => b.rate - a.rate);
  const countTrend       = trend.filter((p) => p.unit === "count");
  const rateTrend        = trend.filter((p) => p.unit === "rate_per_10k");

  const latestCountYear  = countSummary?.year;
  const latestCountPeriod = countSummary?.period ?? "";

  const latestYearTotals: Record<string, number> = countSummary
    ? Object.values(countSummary.data).reduce((acc, provCrimes) => {
        Object.entries(provCrimes).forEach(([ct, n]) => { acc[ct] = (acc[ct] ?? 0) + n; });
        return acc;
      }, {} as Record<string, number>)
    : crimeTotals;
  const grandTotal = Object.values(latestYearTotals).reduce((s, v) => s + v, 0);

  // Spotlight: most affected province + YoY trend
  const topProvince = sorted[0];
  const topProvinceTotal = topProvince
    ? Object.values(topProvince.crimes).reduce((s, v) => s + v, 0)
    : 0;
  const latestTrend = countTrend[countTrend.length - 1];
  const prevTrend   = countTrend[countTrend.length - 2];
  const yoyChange = latestTrend && prevTrend && prevTrend.total > 0
    ? Math.round(((latestTrend.total - prevTrend.total) / prevTrend.total) * 1000) / 10
    : null;

  return (
    <div className="flex flex-col">

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-6 py-16 sm:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(239,68,68,0.08),_transparent_55%)]" />
        <div className="relative max-w-5xl mx-auto">

          <div className="flex flex-wrap items-center gap-2 mb-6">
            <Badge color={isReal ? "emerald" : "yellow"}>
              {isReal ? `Datos reales · ${stats.totalRecords.toLocaleString("es-CR")} registros` : "Datos demo"}
            </Badge>
            <Badge color="slate">OIJ · Observatorio de la Violencia · MJP</Badge>
            <Badge color="slate">{stats.yearRange[0]}–{stats.yearRange[1]}</Badge>
          </div>

          <div className="grid lg:grid-cols-[1fr_auto] gap-10 items-start">
            <div>
              <h1 className="text-5xl sm:text-7xl font-black text-white tracking-tight leading-none mb-4">
                Atlas Criminal<br />
                <span className="text-red-500">Costa Rica</span>
              </h1>
              <p className="text-slate-400 text-lg max-w-xl mb-8 leading-relaxed">
                Plataforma independiente de análisis geoespacial de la criminalidad.
                Datos extraídos directamente del Observatorio de la Violencia del
                Ministerio de Justicia y Paz.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/atlas"     className="btn-primary">Ver Atlas Interactivo</Link>
                <Link href="/dashboard" className="btn-outline">Dashboard completo</Link>
                <Link href="/datos"     className="btn-outline">Explorar datos</Link>
              </div>
            </div>

            {/* Spotlight card */}
            {isReal && grandTotal > 0 && (
              <div className="lg:w-72 w-full rounded-2xl border border-red-900/40 bg-red-950/20 p-5 backdrop-blur-sm">
                <p className="text-[10px] text-red-400 uppercase tracking-widest font-semibold mb-3">
                  Dato destacado · {latestCountYear ?? stats.yearRange[1]}
                </p>
                <p className="text-4xl font-black text-white tabular-nums mb-1">
                  {grandTotal.toLocaleString("es-CR")}
                </p>
                <p className="text-sm text-slate-400 mb-4">delitos registrados en Costa Rica</p>

                {yoyChange !== null && (
                  <div className={`flex items-center gap-1.5 text-sm font-semibold mb-4 ${
                    yoyChange > 0 ? "text-red-400" : yoyChange < 0 ? "text-emerald-400" : "text-slate-400"
                  }`}>
                    {yoyChange > 0 ? <TrendingUp size={16} /> : yoyChange < 0 ? <TrendingDown size={16} /> : <Minus size={16} />}
                    {yoyChange > 0 ? "+" : ""}{yoyChange}% vs {prevTrend?.year}
                  </div>
                )}

                {topProvince && (
                  <div className="border-t border-red-900/30 pt-3">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Provincia más afectada</p>
                    <p className="text-sm font-bold text-white">{topProvince.name}</p>
                    <p className="text-xs text-slate-400">
                      {topProvince.rate} delitos / 100k hab.
                      {topProvinceTotal > 0 && ` · ${topProvinceTotal.toLocaleString("es-CR")} total`}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── KPI grid ─────────────────────────────────────────────── */}
      {grandTotal > 0 && (
        <section className="border-b border-slate-800 bg-slate-900/40">
          <div className="max-w-7xl mx-auto px-6 py-10">
            <div className="flex items-center justify-between mb-5">
              <p className="text-xs text-slate-500 uppercase tracking-widest font-medium">
                Delitos contabilizados ·{" "}
                {latestCountYear
                  ? `${latestCountPeriod} ${latestCountYear}`
                  : `${stats.countYearRange?.[0]}–${stats.countYearRange?.[1]}`}
              </p>
              {stats.countYearRange && (
                <span className="text-xs text-slate-600">Conteos reales (Fuente: Atlas PDF OIJ)</span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <AnimatedKpiCard label="Total delitos"  rawValue={grandTotal}                              sub="todas las categorías" />
              <AnimatedKpiCard label="Hurtos"         rawValue={latestYearTotals.hurto ?? 0}             sub="delito más frecuente" color="text-blue-400" />
              <AnimatedKpiCard label="Robos"          rawValue={latestYearTotals.robo ?? 0}              sub="" color="text-orange-400" />
              <AnimatedKpiCard label="Narcotráfico"   rawValue={latestYearTotals.narcotrafico ?? 0}      sub="" color="text-purple-400" />
              <AnimatedKpiCard label="Homicidios"     rawValue={latestYearTotals.homicidio ?? 0}         sub="delito más grave" color="text-red-400" />
              <AnimatedKpiCard label="Violaciones"    rawValue={latestYearTotals.violacion ?? 0}         sub="" color="text-pink-400" />
            </div>
          </div>
        </section>
      )}

      {/* ── Coverage strip ───────────────────────────────────────── */}
      <section className="border-b border-slate-800 bg-slate-950">
        <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-2 sm:grid-cols-5 gap-6 text-center">
          <CoverageItem Icon={Calendar}  value={`${stats.years.length} años`}                                  label={`${stats.yearRange[0]} → ${stats.yearRange[1]}`} />
          <CoverageItem Icon={MapPin}    value="7 provincias"                                                   label="cobertura nacional completa" />
          <CoverageItem Icon={Home}      value={`${stats.cantonCount} cantones`}                                label="con datos disponibles" />
          <CoverageItem Icon={Map}       value={`${stats.districtCount > 0 ? stats.districtCount : "473+"} distritos`} label="nivel más granular" />
          <CoverageItem Icon={Database}  value={`${stats.sourceFiles} publicaciones`}                           label="del Observatorio de la Violencia" />
        </div>
      </section>

      {/* ── Data source callout ──────────────────────────────────── */}
      <section className="border-b border-slate-800 bg-slate-900/20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap items-center gap-6 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
            <span>
              <strong className="text-slate-300">Conteos reales</strong>{" "}
              {stats.countYearRange ? `(${stats.countYearRange[0]}–${stats.countYearRange[1]})` : ""} —
              Atlas y Anexos Estadísticos en PDF · {(stats.totalRecords - stats.totalRateRecords).toLocaleString()} reg.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
            <span>
              <strong className="text-slate-300">Tasas por 10k hab.</strong>{" "}
              {stats.totalRateRecords > 0 ? "(2018–2022)" : ""} —
              Anexos Estadísticos Excel OIJ/MSP · {stats.totalRateRecords.toLocaleString()} reg.
            </span>
          </div>
          <Link href="/fuentes" className="ml-auto text-red-400 hover:text-red-300 font-medium">Ver fuentes →</Link>
        </div>
      </section>

      {/* ── Count trend ──────────────────────────────────────────── */}
      {countTrend.length > 0 && (
        <section className="border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Tendencia reciente · Conteos reales</h2>
                <p className="text-xs text-slate-500 mt-0.5">Datos de Atlas PDF · valores absolutos de delitos</p>
              </div>
              <Link href="/dashboard" className="text-xs text-red-400 hover:text-red-300">Ver dashboard completo →</Link>
            </div>
            <MiniBarChart points={countTrend} />
          </div>
        </section>
      )}

      {/* ── Historical rate trend ────────────────────────────────── */}
      {rateTrend.length > 0 && (
        <section className="border-b border-slate-800 bg-slate-950/50">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Serie histórica · Tasas por 10,000 hab.</h2>
                <p className="text-xs text-slate-500 mt-0.5">Datos de Anexos Estadísticos Excel OIJ · suma de tasas provinciales</p>
              </div>
              <span className="text-xs text-amber-500/70 border border-amber-900/50 bg-amber-950/30 rounded px-2 py-0.5">No comparables con conteos</span>
            </div>
            <MiniBarChart points={rateTrend} color="bg-amber-600/60" hoverColor="hover:bg-amber-500" />
          </div>
        </section>
      )}

      {/* ── Province table ────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-10 w-full">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-white">Resumen por Provincia</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {provinces[0]?.crimes.homicidio !== undefined
                ? "Datos del año más reciente disponible por provincia"
                : "Datos de muestra"}
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/cantones" className="text-xs text-slate-400 hover:text-white transition-colors">Ver cantones →</Link>
            <Link href="/datos"    className="text-xs text-red-400 hover:text-red-300 transition-colors">Ver todos los datos →</Link>
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-slate-800/60 text-slate-400 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Provincia</th>
                {CATEGORIES.map((c) => (
                  <th key={c.key} className="px-4 py-2 font-medium text-center text-xs" style={{ color: c.color }}>{c.label}</th>
                ))}
                <th className="px-4 py-3 font-medium text-right">Total</th>
                <th className="px-4 py-3 font-medium">Tasa /100k</th>
                <th className="px-4 py-3 font-medium" title="Solo disponible para provincias con dos años anuales consecutivos en la misma fuente">Var. anual</th>
                <th className="px-4 py-3 font-medium w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {sorted.map((p) => {
                const total = Object.values(p.crimes).reduce((s, v) => s + v, 0);
                return (
                  <tr key={p.code} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-4 py-3 font-semibold text-white">{p.name}</td>
                    {CATEGORIES.map((c) => (
                      <td key={c.key} className="px-4 py-2 text-slate-300 text-center text-xs tabular-nums">
                        {(p.crimes[c.key as keyof typeof p.crimes] ?? 0).toLocaleString("es-CR")}
                      </td>
                    ))}
                    <td className="px-4 py-3 font-semibold text-white text-right tabular-nums">
                      {total.toLocaleString("es-CR")}
                    </td>
                    <td className="px-4 py-3">
                      <RateBar rate={p.rate} max={sorted[0].rate} />
                    </td>
                    <td className={`px-4 py-3 font-medium text-sm ${p.trend > 0 ? "text-red-400" : p.trend < 0 ? "text-emerald-400" : "text-slate-500"}`}>
                      {p.trend !== 0 ? `${p.trend > 0 ? "+" : ""}${p.trend}%` : "—"}
                    </td>
                    <td className="px-2 py-3">
                      <Link
                        href={`/provincias/${provinceSlug(p.name)}`}
                        className="text-xs text-slate-600 group-hover:text-red-400 transition-colors"
                      >
                        <ArrowRight size={14} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-600 mt-2">
          Fuente: Observatorio de la Violencia, Ministerio de Justicia y Paz ·{" "}
          {stats.sourceFiles} publicaciones procesadas
          {stats.generatedAt && ` · Actualizado ${new Date(stats.generatedAt).toLocaleDateString("es-CR")}`}
        </p>
      </section>

      {/* ── Province quick-nav cards ─────────────────────────────── */}
      <section className="border-t border-slate-800 bg-slate-900/20">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Explorar por provincia</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {Object.entries(PROVINCE_META).map(([name, meta]) => {
              const slug = provinceSlug(name);
              const provData = provinces.find((p) => p.name === name);
              const provTotal = provData ? Object.values(provData.crimes).reduce((s, v) => s + v, 0) : 0;
              return (
                <Link key={name} href={`/provincias/${slug}`}
                  className="rounded-lg border border-slate-800 bg-slate-900/50 hover:border-red-900/60 hover:bg-slate-800/50 p-3 transition-all group">
                  <p className="text-xs font-bold text-slate-400 group-hover:text-red-400 transition-colors">{meta.code}</p>
                  <p className="text-sm font-semibold text-white mt-0.5 leading-tight">{name}</p>
                  {provTotal > 0 ? (
                    <p className="text-[10px] text-slate-500 mt-1 tabular-nums">{provTotal.toLocaleString("es-CR")} del.</p>
                  ) : (
                    <p className="text-[10px] text-slate-600 mt-1">{(meta.population / 1000).toFixed(0)}k hab.</p>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Feature grid ─────────────────────────────────────────── */}
      <section className="border-t border-slate-800 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-6 py-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { Icon: Map,       title: "Atlas Interactivo", desc: "Mapa coroplético real de Costa Rica por provincia. Filtra por categoría.", href: "/atlas", cta: "Abrir mapa" },
            { Icon: BarChart3, title: "Dashboard",          desc: "Tendencias anuales reales, comparativas provinciales y cantones.",           href: "/dashboard", cta: "Ver gráficas" },
            { Icon: Home,      title: "Cantones",           desc: `Rankings de los ${stats.cantonCount} cantones con datos disponibles.`,       href: "/cantones", cta: "Ver cantones" },
            { Icon: Search,    title: "Explorador de Datos", desc: "Todos los registros filtrables. Exporta a CSV. Incluye unidades de medida.", href: "/datos", cta: "Explorar datos" },
          ].map((f) => (
            <div key={f.href} className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 flex flex-col gap-3 hover:border-slate-700 transition-colors">
              <f.Icon size={22} className="text-red-500/80" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-white mb-1">{f.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
              <Link href={f.href} className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors">{f.cta} →</Link>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function MiniBarChart({
  points,
  color = "bg-red-600/80",
  hoverColor = "hover:bg-red-500",
}: {
  points: { year: number; total: number }[];
  color?: string;
  hoverColor?: string;
}) {
  const max = Math.max(...points.map((t) => t.total), 1);
  return (
    <div className="flex items-end gap-2 h-24">
      {points.map((pt) => {
        const pct = (pt.total / max) * 100;
        return (
          <div key={pt.year} className="flex-1 flex flex-col items-center gap-1 group">
            <span className="text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity tabular-nums">
              {pt.total.toLocaleString("es-CR")}
            </span>
            <div className={`w-full rounded-t-sm ${color} ${hoverColor} transition-colors`}
              style={{ height: `${Math.max(pct, 4)}%` }} />
            <span className="text-xs text-slate-500">{pt.year}</span>
          </div>
        );
      })}
    </div>
  );
}

function Badge({ children, color }: { children: React.ReactNode; color: "emerald" | "yellow" | "slate" }) {
  const cls = color === "emerald" ? "border-emerald-800 text-emerald-400 bg-emerald-950/50"
    : color === "yellow" ? "border-yellow-800 text-yellow-400 bg-yellow-950/50"
    : "border-slate-700 text-slate-400 bg-slate-800/50";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs ${cls}`}>
      {color === "emerald" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
      {children}
    </span>
  );
}

function CoverageItem({ Icon, value, label }: { Icon: React.ComponentType<{ size?: number; className?: string }>; value: string; label: string }) {
  return (
    <div>
      <Icon size={20} className="text-red-500/70 mx-auto mb-2" />
      <p className="text-base font-bold text-white">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

function RateBar({ rate, max }: { rate: number; max: number }) {
  const pct = max > 0 ? Math.min((rate / max) * 100, 100) : 0;
  const color = pct > 75 ? "bg-red-500" : pct > 50 ? "bg-orange-500" : pct > 25 ? "bg-yellow-500" : "bg-emerald-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 rounded-full bg-slate-700">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-400 tabular-nums">{rate}</span>
    </div>
  );
}
