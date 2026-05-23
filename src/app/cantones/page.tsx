import type { Metadata } from "next";
import { getCantonRankings, getStats } from "@/lib/data";
import CantonesClient from "./CantonesClient";

export const metadata: Metadata = { title: "Cantones" };

export default function CantonesPage() {
  const cantons  = getCantonRankings();
  const stats    = getStats();
  const maxTotal = cantons[0]?.total ?? 1;

  const byProv: Record<string, number> = {};
  cantons.forEach((c) => { byProv[c.province] = (byProv[c.province] ?? 0) + 1; });
  const crimeTypes = [...new Set(cantons.flatMap((c) => Object.keys(c.crimes)))].sort();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">

      <div className="border-b border-slate-800 pb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Rankings por Cantón</h1>
        <p className="text-slate-400 text-sm">
          {cantons.length} cantones con datos disponibles · {stats.yearRange[0]}–{stats.yearRange[1]} · acumulado todas las categorías
        </p>
        {stats.totalRateRecords > 0 && (
          <p className="text-xs text-amber-500/70 mt-1">
            Nota: incluye tasas por 10k hab. (Excel 2018-2022) y conteos reales (PDF 2023+).
            Los cantones solo aparecen si tienen datos en los archivos Excel provinciales.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Object.entries(byProv).sort((a, b) => b[1] - a[1]).map(([prov, count]) => (
          <div key={prov} className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
            <p className="text-xs text-slate-500 mb-0.5">{prov}</p>
            <p className="text-sm font-semibold text-white">{count} cantones</p>
          </div>
        ))}
      </div>

      <CantonesClient cantons={cantons} crimeTypes={crimeTypes} maxTotal={maxTotal} />

      <p className="text-xs text-slate-600">
        Datos acumulados de {stats.sourceFiles} publicaciones del Observatorio de la Violencia.
        Los totales representan la suma de todos los años disponibles para cada cantón.
      </p>
    </div>
  );
}
