"use client";
import { useState } from "react";
import Link from "next/link";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell, Legend,
} from "recharts";
import type { YearTrendPoint, CantonData, ProvinceData } from "@/lib/data";
import { CATEGORIES, CRIME_COLORS, provinceSlug } from "@/lib/categories";

interface Props {
  trend: YearTrendPoint[];
  cantons: CantonData[];
  provinces: ProvinceData[];
  crimeTotals: Record<string, number>;
  provinceAggregates: Record<string, Record<string, number>>;
  hasCountData: boolean;
  rateSummaryYear: number | null;
  stats: { totalRecords: number; totalCount: number; sourceFiles: number; yearRange: [number, number]; cantonCount: number };
}

const tt = {
  contentStyle: { background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9", fontSize: 11 },
  labelStyle: { color: "#94a3b8" },
  cursor: { fill: "rgba(255,255,255,0.03)" },
};

export default function DashboardClient({ trend, cantons, provinces, crimeTotals, provinceAggregates, hasCountData, rateSummaryYear, stats }: Props) {
  const [selectedCrimes, setSelectedCrimes] = useState<string[]>(["homicidio", "robo", "hurto", "narcotrafico"]);

  const grandTotal   = stats.totalCount;
  const topCantons   = cantons.slice(0, 25);
  const crimeList    = Object.entries(crimeTotals).sort((a, b) => b[1] - a[1]);

  const countTrend = trend.filter((p) => p.unit === "count");
  const rateTrend  = trend.filter((p) => p.unit === "rate_per_10k");

  const toggleCrime = (ct: string) =>
    setSelectedCrimes((prev) => prev.includes(ct) ? prev.filter((c) => c !== ct) : [...prev, ct]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard Estadístico</h1>
          <p className="text-slate-400 text-sm mt-1">
            {stats.yearRange[0]}–{stats.yearRange[1]} · {stats.totalRecords.toLocaleString("es-CR")} registros ·{" "}
            {hasCountData
              ? `${grandTotal.toLocaleString("es-CR")} delitos contabilizados`
              : `tasas /10k · año de referencia ${rateSummaryYear ?? stats.yearRange[1]}`}{" "}
            · {stats.sourceFiles} publicaciones
          </p>
        </div>
        <div className="flex gap-2 text-xs flex-wrap">
          {hasCountData ? (
            <>
              <span className="px-2.5 py-1 rounded-full border border-emerald-800 text-emerald-400 bg-emerald-950/40">
                Conteos reales: 2023–2025
              </span>
              <span className="px-2.5 py-1 rounded-full border border-amber-800 text-amber-400 bg-amber-950/40">
                Tasas /10k: 2018–2022
              </span>
            </>
          ) : (
            <span className="px-2.5 py-1 rounded-full border border-amber-800 text-amber-400 bg-amber-950/40">
              Tasas /10k · Anexos Excel OIJ 2018–2022
            </span>
          )}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {crimeList.map(([ct, count]) => (
          <div key={ct} className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 capitalize">{ct}</p>
            <p className="text-lg font-bold tabular-nums" style={{ color: CRIME_COLORS[ct] ?? "#fff" }}>
              {count.toLocaleString("es-CR")}
            </p>
            {!hasCountData && (
              <p className="text-[9px] text-slate-600 mt-0.5">tasa /10k · {rateSummaryYear}</p>
            )}
          </div>
        ))}
      </div>

      {/* Count trend — real numbers (2023+) */}
      {countTrend.length > 0 && (
        <ChartCard
          title="Tendencia por Categoría · Conteos reales"
          subtitle="Delitos absolutos extraídos de Atlas PDF (2023–2025)"
          badge={{ label: "Conteos reales", cls: "border-emerald-800 text-emerald-400 bg-emerald-950/40" }}
        >
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.keys(CRIME_COLORS).filter(ct => ct !== "extorsion").map((ct) => (
              <button key={ct} onClick={() => toggleCrime(ct)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                  selectedCrimes.includes(ct) ? "text-white" : "text-slate-600 border-slate-700"
                }`}
                style={selectedCrimes.includes(ct) ? { borderColor: CRIME_COLORS[ct], background: CRIME_COLORS[ct] + "22", color: CRIME_COLORS[ct] } : {}}>
                {ct}
              </button>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={countTrend} margin={{ left: -10, right: 10, top: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="year" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip {...tt} />
              {selectedCrimes.map((ct) => (
                <Line key={ct} type="monotone" dataKey={ct} stroke={CRIME_COLORS[ct]} strokeWidth={2}
                  dot={{ fill: CRIME_COLORS[ct], r: 3 }} name={ct} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Rate trend — historical tasas (2018-2022) */}
      {rateTrend.length > 0 && (
        <ChartCard
          title="Tendencia por Categoría · Estimado nacional 2018–2022"
          subtitle="Estimado: tasa /10k × población provincial (Anexos Excel OIJ). Valores comparables entre años, no con conteos reales."
          badge={{ label: "Estimado basado en tasas Excel", cls: "border-amber-800 text-amber-400 bg-amber-950/40" }}
        >
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.keys(CRIME_COLORS).filter(ct => ct !== "extorsion").map((ct) => (
              <button key={ct} onClick={() => toggleCrime(ct)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                  selectedCrimes.includes(ct) ? "text-white" : "text-slate-600 border-slate-700"
                }`}
                style={selectedCrimes.includes(ct) ? { borderColor: CRIME_COLORS[ct], background: CRIME_COLORS[ct] + "22", color: CRIME_COLORS[ct] } : {}}>
                {ct}
              </button>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={rateTrend} margin={{ left: -10, right: 10, top: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="year" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip {...tt} formatter={(v, name) => [`~${Number(v).toLocaleString("es-CR")} est.`, name]} />
              {selectedCrimes.map((ct) => (
                <Line key={ct} type="monotone" dataKey={ct} stroke={CRIME_COLORS[ct] + "99"} strokeWidth={1.5}
                  strokeDasharray="4 2" dot={{ fill: CRIME_COLORS[ct], r: 2.5 }} name={ct} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Total trend bar */}
      <ChartCard title="Total de Delitos por Año" subtitle="Todos los tipos de delito combinados">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={trend} margin={{ left: -10, right: 10, top: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="year" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip {...tt} formatter={(v) => [Number(v).toLocaleString("es-CR"), "Total"]} />
            <Bar dataKey="total" radius={[4, 4, 0, 0]}>
              {trend.map((pt, i) => (
                <Cell key={i} fill={pt.unit === "count" ? "#ef4444" : "#64748b"} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="text-xs text-slate-600 mt-2">
          {hasCountData
            ? "Barras rojas = conteos reales (Atlas PDF). Barras grises = estimado nacional basado en tasas Excel (tasa × población)."
            : "Estimado nacional: tasa /10k × población provincial — Anexos Estadísticos Excel OIJ (2018–2022)."}
        </p>
      </ChartCard>

      {/* Crime breakdown + Province comparison */}
      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="Distribución por Tipo de Delito" subtitle={hasCountData ? "Total acumulado · solo conteos reales" : `Tasa máxima por provincia · ${rateSummaryYear ?? ""}`}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={crimeList.map(([name, value]) => ({ name, value }))}
              margin={{ left: -10, right: 10, top: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip {...tt} formatter={(v) => [Number(v).toLocaleString("es-CR"), "Delitos"]} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {crimeList.map(([ct]) => (
                  <Cell key={ct} fill={CRIME_COLORS[ct] ?? "#64748b"} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Comparativa Provincial" subtitle="Tasa por 100k habitantes">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={[...provinces].sort((a, b) => b.rate - a.rate).map((p) => ({ name: p.name.split(" ")[0], rate: p.rate }))}
              layout="vertical" margin={{ left: 55, right: 20, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip {...tt} formatter={(v) => [`${v}`, "Tasa /100k"]} />
              <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
                {[...provinces].sort((a, b) => b.rate - a.rate).map((p, i, arr) => {
                  const max = arr[0]?.rate ?? 1;
                  const pct = p.rate / max;
                  const fill = pct > 0.75 ? "#ef4444" : pct > 0.5 ? "#f97316" : "#22c55e";
                  return <Cell key={p.code} fill={fill} fillOpacity={0.85} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Multi-crime stacked year chart */}
      <ChartCard title="Composición Anual por Categoría" subtitle="Todos los tipos de delito apilados por año">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={trend} margin={{ left: -10, right: 10, top: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="year" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip {...tt} formatter={(v) => [Number(v).toLocaleString("es-CR"), ""]} />
            <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
            {["hurto", "robo", "narcotrafico", "homicidio", "violacion"].map((ct) => (
              <Bar key={ct} dataKey={ct} stackId="a" fill={CRIME_COLORS[ct]} name={ct} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Top 25 cantons */}
      <ChartCard title="Top 25 Cantones por Delitos Totales" subtitle={`De ${stats.cantonCount} cantones con datos disponibles`}>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={topCantons.map((c) => ({ name: c.canton.length > 14 ? c.canton.slice(0, 13) + "…" : c.canton, total: c.total, prov: c.province }))}
            layout="vertical" margin={{ left: 90, right: 20, top: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
            <XAxis type="number" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} width={85} />
            <Tooltip {...tt}
              formatter={(v) => [Number(v).toLocaleString("es-CR"), "Delitos"]}
              labelFormatter={(label, payload) => `${label} (${payload?.[0]?.payload?.prov ?? ""})`} />
            <Bar dataKey="total" radius={[0, 4, 4, 0]} fill="#ef4444" fillOpacity={0.75} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Safest areas */}
      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="Zonas Más Seguras" subtitle="Provincias con menor tasa de criminalidad por 100k hab.">
          <div className="space-y-3 mt-1">
            {[...provinces].sort((a, b) => a.rate - b.rate).map((p, i) => {
              const maxRate = Math.max(...provinces.map((x) => x.rate));
              const pct = (p.rate / maxRate) * 100;
              const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
              return (
                <div key={p.code}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {medal && <span className="text-sm">{medal}</span>}
                      <span className={`text-sm font-medium ${i < 3 ? "text-emerald-300" : "text-slate-300"}`}>{p.name}</span>
                    </div>
                    <span className="text-xs tabular-nums text-slate-400">{p.rate.toLocaleString("es-CR")} /100k</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(pct, 2)}%`, background: i < 3 ? "#22c55e" : i < 5 ? "#f97316" : "#ef4444" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-slate-600 mt-4">
            Tasa basada en total de delitos ÷ población provincial. Datos del año más reciente disponible.
          </p>
        </ChartCard>

        <ChartCard title="Top 5 Cantones Más Activos" subtitle="Cantones con mayor volumen de delitos registrados">
          <div className="space-y-3 mt-1">
            {cantons.slice(0, 5).map((c, i) => {
              const maxT = cantons[0]?.total ?? 1;
              const pct = (c.total / maxT) * 100;
              return (
                <div key={`${c.province}-${c.canton}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-600 w-4 shrink-0">{i + 1}</span>
                      <span className="text-sm font-medium text-slate-200">{c.canton}</span>
                      <span className="text-[10px] text-slate-500">{c.province}</span>
                    </div>
                    <span className="text-xs tabular-nums font-semibold text-red-400">{c.total.toLocaleString("es-CR")}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-red-500/70 transition-all duration-500"
                      style={{ width: `${Math.max(pct, 2)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-slate-600 mt-4">
            Totales acumulados de todos los años disponibles. No ajustado por población.
          </p>
        </ChartCard>
      </div>

      {/* Province × crime-type table — all-time aggregates */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Desglose Completo por Provincia y Categoría</h2>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${hasCountData ? "border-emerald-800 text-emerald-400 bg-emerald-950/40" : "border-amber-800 text-amber-400 bg-amber-950/40"}`}>
            {hasCountData ? `Acumulado ${stats.yearRange[0]}–${stats.yearRange[1]}` : `Tasa /10k · ${rateSummaryYear ?? stats.yearRange[1]}`}
          </span>
        </div>
        <div className="rounded-xl border border-slate-800 overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-slate-800/60 text-slate-400 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Provincia</th>
                {CATEGORIES.map((c) => (
                  <th key={c.key} className="px-3 py-3 font-medium text-center" style={{ color: c.color }}>{c.label}</th>
                ))}
                <th className="px-4 py-3 font-medium text-right">Total</th>
                <th className="px-2 py-3 font-medium w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {[...provinces]
                .sort((a, b) => {
                  const aTotal = Object.values(provinceAggregates[a.name] ?? {}).reduce((s, v) => s + v, 0);
                  const bTotal = Object.values(provinceAggregates[b.name] ?? {}).reduce((s, v) => s + v, 0);
                  return bTotal - aTotal;
                })
                .map((p) => {
                  const agg = provinceAggregates[p.name] ?? {};
                  const total = Object.values(agg).reduce((s, v) => s + v, 0);
                  return (
                    <tr key={p.code} className="hover:bg-slate-800/30 transition-colors group">
                      <td className="px-4 py-3 font-medium text-white">{p.name}</td>
                      {CATEGORIES.map((c) => (
                        <td key={c.key} className="px-3 py-3 text-slate-300 text-center text-xs tabular-nums">
                          {(agg[c.key] ?? 0).toLocaleString("es-CR")}
                        </td>
                      ))}
                      <td className="px-4 py-3 font-semibold text-right tabular-nums">{total.toLocaleString("es-CR")}</td>
                      <td className="px-2 py-3">
                        <Link href={`/provincias/${provinceSlug(p.name)}`}
                          className="text-xs text-slate-600 group-hover:text-red-400 transition-colors">→</Link>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-600 mt-2">
          {hasCountData
            ? "Totales acumulados de todos los años disponibles · máximo anual por fuente para evitar doble conteo."
            : `Tasas por 10,000 habitantes · Anexos Estadísticos Excel OIJ ${rateSummaryYear ?? ""} · los conteos absolutos por extracción PDF están pendientes de corrección.`}
        </p>
      </div>

    </div>
  );
}

function ChartCard({ title, subtitle, badge, children }: {
  title: string; subtitle: string; badge?: { label: string; cls: string }; children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
      <div className="flex items-start justify-between gap-3 mb-1">
        <p className="text-sm font-semibold text-white">{title}</p>
        {badge && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${badge.cls}`}>{badge.label}</span>
        )}
      </div>
      <p className="text-xs text-slate-500 mb-4">{subtitle}</p>
      {children}
    </div>
  );
}
