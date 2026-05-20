"use client";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell
} from "recharts";
import { PROVINCES, CATEGORIES, MONTHLY_TREND, totalCrimes } from "@/lib/mockData";

const totalAll = PROVINCES.reduce((s, p) => s + totalCrimes(p), 0);
const totalHomicidios = PROVINCES.reduce((s, p) => s + p.crimes.homicidio, 0);
const avgRate = (PROVINCES.reduce((s, p) => s + p.rate, 0) / PROVINCES.length).toFixed(1);
const worstProvince = [...PROVINCES].sort((a, b) => b.rate - a.rate)[0];

const categoryTotals = CATEGORIES.map((cat) => ({
  name: cat.label,
  value: PROVINCES.reduce((s, p) => s + p.crimes[cat.key], 0),
  color: cat.color,
}));

function tooltipStyle() {
  return {
    contentStyle: { background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9", fontSize: 12 },
    labelStyle: { color: "#94a3b8" },
    cursor: { fill: "rgba(255,255,255,0.04)" },
  };
}

export default function DashboardPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Estadísticas 2024</h1>
        <p className="text-slate-400 text-sm mt-1">Resumen nacional de criminalidad — Costa Rica</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="Total delitos" value={totalAll.toLocaleString("es-CR")} sub="todas las categorías" />
        <KpiCard label="Homicidios" value={totalHomicidios.toString()} sub="↑ Limón más afectada" color="text-red-400" />
        <KpiCard label="Tasa promedio" value={`${avgRate}`} sub="delitos por 100k hab." color="text-orange-400" />
        <KpiCard label="Provincia crítica" value={worstProvince.name} sub={`${worstProvince.rate} / 100k`} color="text-yellow-400" />
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Monthly trend */}
        <ChartCard title="Tendencia Mensual 2024" subtitle="Homicidios, Robos y Agresiones">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={MONTHLY_TREND} margin={{ left: -10, right: 10, top: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip {...tooltipStyle()} />
              <Line type="monotone" dataKey="homicidio" stroke="#ef4444" strokeWidth={2} dot={false} name="Homicidios" />
              <Line type="monotone" dataKey="robo" stroke="#f97316" strokeWidth={2} dot={false} name="Robos" />
              <Line type="monotone" dataKey="agresion" stroke="#eab308" strokeWidth={2} dot={false} name="Agresiones" />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-3 text-xs">
            {[
              { color: "#ef4444", label: "Homicidios" },
              { color: "#f97316", label: "Robos" },
              { color: "#eab308", label: "Agresiones" },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1.5 text-slate-400">
                <span className="w-3 h-0.5 rounded" style={{ background: l.color }} />
                {l.label}
              </div>
            ))}
          </div>
        </ChartCard>

        {/* Category breakdown */}
        <ChartCard title="Delitos por Categoría" subtitle="Total nacional 2024">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={categoryTotals} margin={{ left: -10, right: 10, top: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip {...tooltipStyle()} formatter={(v) => [(Number(v)).toLocaleString("es-CR"), "Delitos"]} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {categoryTotals.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Province comparison bars */}
      <ChartCard title="Comparativa Provincial" subtitle="Tasa de criminalidad por 100,000 habitantes">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={[...PROVINCES].sort((a, b) => b.rate - a.rate)}
            layout="vertical"
            margin={{ left: 60, right: 20, top: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
            <XAxis type="number" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 70]} />
            <YAxis type="category" dataKey="name" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip {...tooltipStyle()} formatter={(v) => [`${v}`, "Tasa / 100k"]} />
            <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
              {[...PROVINCES].sort((a, b) => b.rate - a.rate).map((p) => (
                <Cell
                  key={p.code}
                  fill={p.rate > 55 ? "#ef4444" : p.rate > 45 ? "#f97316" : p.rate > 35 ? "#eab308" : "#22c55e"}
                  fillOpacity={0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Detail table */}
      <div>
        <h2 className="text-base font-semibold text-white mb-3">Desglose por Provincia y Categoría</h2>
        <div className="rounded-xl border border-slate-800 overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-slate-800/60 text-slate-400 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Provincia</th>
                {CATEGORIES.map((c) => (
                  <th key={c.key} className="px-4 py-3 font-medium">{c.label}</th>
                ))}
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Var. anual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {[...PROVINCES].sort((a, b) => b.rate - a.rate).map((p) => (
                <tr key={p.code} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-white">{p.name}</td>
                  {CATEGORIES.map((c) => (
                    <td key={c.key} className="px-4 py-3 text-slate-300">
                      {p.crimes[c.key].toLocaleString("es-CR")}
                    </td>
                  ))}
                  <td className="px-4 py-3 font-medium text-slate-200">{totalCrimes(p).toLocaleString("es-CR")}</td>
                  <td className={`px-4 py-3 font-medium ${p.trend > 0 ? "text-red-400" : "text-emerald-400"}`}>
                    {p.trend > 0 ? "+" : ""}{p.trend}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, color = "text-white" }: {
  label: string; value: string; sub: string; color?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
      <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-1">{sub}</p>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: {
  title: string; subtitle: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="text-xs text-slate-500 mb-4">{subtitle}</p>
      {children}
    </div>
  );
}
