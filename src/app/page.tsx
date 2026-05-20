import Link from "next/link";
import { getProvinces, getDataMeta } from "@/lib/data";
import { totalCrimes } from "@/lib/mockData";

export default function HomePage() {
  const { provinces, isReal } = getProvinces();
  const meta = getDataMeta();

  const totalHomicides = provinces.reduce((s, p) => s + p.crimes.homicidio, 0);
  const totalRobos = provinces.reduce((s, p) => s + p.crimes.robo, 0);
  const totalAll = provinces.reduce((s, p) => s + totalCrimes(p), 0);
  const worstProvince = [...provinces].sort((a, b) => b.rate - a.rate)[0];

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-6 py-24 sm:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(239,68,68,0.08),_transparent_60%)]" />
        <div className="relative max-w-4xl mx-auto">
          {/* Data source badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/50 px-3 py-1 text-xs text-slate-400 mb-8">
            <span className={`w-1.5 h-1.5 rounded-full ${isReal ? "bg-emerald-500" : "bg-yellow-500"}`} />
            {isReal
              ? `Datos reales — ${meta.totalRecords.toLocaleString("es-CR")} registros de ${meta.sourceFiles} publicaciones`
              : "Datos de demostración — ejecuta npm run update-data para datos reales"}
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold text-white tracking-tight leading-tight mb-6">
            Atlas Criminal
            <span className="text-red-500"> Costa Rica</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed">
            Análisis geoespacial independiente de la criminalidad en Costa Rica.
            Visualizaciones interactivas por provincia, cantón y tipo de delito —
            construido porque los datos oficiales del OIJ no son suficientes.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/atlas"
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium px-6 py-3 transition-colors text-sm"
            >
              Ver Atlas Interactivo
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-9a1 1 0 010-1L9 1m0 0l5.447 9a1 1 0 010 1L9 20m0-19v19" />
              </svg>
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 font-medium px-6 py-3 transition-colors text-sm"
            >
              Estadísticas 2024
            </Link>
          </div>
        </div>
      </section>

      {/* KPI strip */}
      <section className="border-b border-slate-800 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-2 sm:grid-cols-4 gap-6">
          <Stat label="Delitos totales" value={totalAll.toLocaleString("es-CR")} sub="todas las categorías" />
          <Stat label="Homicidios" value={totalHomicides.toString()} sub="tasa más alta: Limón" color="text-red-400" />
          <Stat label="Robos registrados" value={totalRobos.toLocaleString("es-CR")} sub="datos anuales" />
          <Stat label="Provincia más afectada" value={worstProvince.name} sub={`${worstProvince.rate} por 100k hab.`} color="text-orange-400" />
        </div>
      </section>

      {/* Feature cards */}
      <section className="max-w-7xl mx-auto px-6 py-16 grid sm:grid-cols-3 gap-6">
        <FeatureCard
          icon="🗺️"
          title="Mapa Interactivo"
          description="Coropletas por provincia. Filtra por tipo de delito y visualiza densidad delictiva con capas de datos reales del Observatorio de la Violencia."
          href="/atlas"
          linkLabel="Abrir Atlas"
        />
        <FeatureCard
          icon="📊"
          title="Dashboard Estadístico"
          description="Gráficas de tendencia mensual, comparativas provinciales y distribución por categoría de delito extraídos de las publicaciones oficiales."
          href="/dashboard"
          linkLabel="Ver estadísticas"
        />
        <FeatureCard
          icon="📥"
          title="Datos del Observatorio"
          description="Scraping automático de los Anexos Estadísticos (XLS/XLSX) del Observatorio de la Violencia del Ministerio de Justicia y Paz."
          href="/dashboard"
          linkLabel="Ver fuente"
        />
      </section>

      {/* Province table */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Resumen por Provincia</h2>
          {!isReal && (
            <span className="text-xs text-yellow-500 border border-yellow-800 bg-yellow-950/50 rounded-full px-3 py-1">
              Datos de demostración
            </span>
          )}
        </div>
        <div className="rounded-xl border border-slate-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/60 text-slate-400 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Provincia</th>
                <th className="px-4 py-3 font-medium">Homicidios</th>
                <th className="px-4 py-3 font-medium">Robos</th>
                <th className="px-4 py-3 font-medium">Total delitos</th>
                <th className="px-4 py-3 font-medium">Tasa /100k</th>
                <th className="px-4 py-3 font-medium">Variación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {[...provinces].sort((a, b) => b.rate - a.rate).map((p) => (
                <tr key={p.code} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 font-medium text-white">{p.name}</td>
                  <td className="px-4 py-3 text-red-400">{p.crimes.homicidio}</td>
                  <td className="px-4 py-3 text-slate-300">{p.crimes.robo.toLocaleString("es-CR")}</td>
                  <td className="px-4 py-3 text-slate-300">{totalCrimes(p).toLocaleString("es-CR")}</td>
                  <td className="px-4 py-3">
                    <RateBar rate={p.rate} max={70} />
                  </td>
                  <td className={`px-4 py-3 font-medium ${p.trend > 0 ? "text-red-400" : p.trend < 0 ? "text-emerald-400" : "text-slate-500"}`}>
                    {p.trend !== 0 ? (p.trend > 0 ? "+" : "") + p.trend + "%" : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {isReal && meta.generatedAt && (
          <p className="text-xs text-slate-600 mt-3">
            Última actualización: {new Date(meta.generatedAt).toLocaleDateString("es-CR")}
          </p>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, sub, color = "text-white" }: {
  label: string; value: string; sub: string; color?: string;
}) {
  return (
    <div>
      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
    </div>
  );
}

function FeatureCard({ icon, title, description, href, linkLabel }: {
  icon: string; title: string; description: string; href: string; linkLabel: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col gap-4">
      <span className="text-3xl">{icon}</span>
      <div>
        <h3 className="text-white font-semibold mb-2">{title}</h3>
        <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
      </div>
      <Link href={href} className="text-sm text-red-400 hover:text-red-300 font-medium transition-colors mt-auto">
        {linkLabel} →
      </Link>
    </div>
  );
}

function RateBar({ rate, max }: { rate: number; max: number }) {
  const pct = Math.min((rate / max) * 100, 100);
  const color = rate > 50 ? "bg-red-500" : rate > 35 ? "bg-orange-500" : "bg-emerald-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-1.5 rounded-full bg-slate-700">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-slate-300 text-xs">{rate}</span>
    </div>
  );
}
