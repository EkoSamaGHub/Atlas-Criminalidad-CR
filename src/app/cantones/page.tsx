import { getCantonRankings, getStats } from "@/lib/data";

const CRIME_COLORS: Record<string, string> = {
  homicidio: "#ef4444", robo: "#f97316", hurto: "#3b82f6",
  narcotrafico: "#8b5cf6", violacion: "#ec4899", agresion: "#eab308",
};

export default function CantonesPage() {
  const cantons = getCantonRankings();
  const stats   = getStats();
  const maxTotal = cantons[0]?.total ?? 1;

  // Group by province for province filter counts
  const byProv: Record<string, number> = {};
  cantons.forEach((c) => { byProv[c.province] = (byProv[c.province] ?? 0) + 1; });
  const crimeTypes = [...new Set(cantons.flatMap((c) => Object.keys(c.crimes)))].sort();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">

      {/* Header */}
      <div className="border-b border-slate-800 pb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Rankings por Cantón</h1>
        <p className="text-slate-400 text-sm">
          {cantons.length} cantones con datos disponibles · {stats.yearRange[0]}–{stats.yearRange[1]} acumulado
        </p>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Object.entries(byProv).sort((a, b) => b[1] - a[1]).map(([prov, count]) => (
          <div key={prov} className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
            <p className="text-xs text-slate-500 mb-0.5">{prov}</p>
            <p className="text-sm font-semibold text-white">{count} cantones</p>
          </div>
        ))}
      </div>

      {/* Canton table — ALL cantons */}
      <div className="rounded-xl border border-slate-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/60 text-slate-400 text-left sticky top-0">
            <tr>
              <th className="px-3 py-3 font-medium w-8">#</th>
              <th className="px-4 py-3 font-medium">Cantón</th>
              <th className="px-4 py-3 font-medium">Provincia</th>
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
              <tr key={`${c.province}-${c.canton}`} className="hover:bg-slate-800/30 transition-colors">
                <td className="px-3 py-2.5 text-slate-600 text-xs tabular-nums">{i + 1}</td>
                <td className="px-4 py-2.5 font-medium text-white">{c.canton}</td>
                <td className="px-4 py-2.5 text-slate-400 text-xs">{c.province}</td>
                {crimeTypes.map((ct) => (
                  <td key={ct} className="px-3 py-2.5 text-center text-xs tabular-nums text-slate-300">
                    {(c.crimes[ct] ?? 0) > 0 ? (c.crimes[ct] ?? 0).toLocaleString("es-CR") : <span className="text-slate-700">—</span>}
                  </td>
                ))}
                <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-white">
                  {c.total.toLocaleString("es-CR")}
                </td>
                <td className="px-4 py-2.5">
                  <div className="w-28 h-1.5 rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-red-500/70"
                      style={{ width: `${(c.total / maxTotal) * 100}%` }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-600">
        Datos acumulados de {stats.sourceFiles} publicaciones del Observatorio de la Violencia.
        Los totales representan la suma de todos los años disponibles para cada cantón.
      </p>
    </div>
  );
}
