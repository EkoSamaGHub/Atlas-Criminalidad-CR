"use client";
import { useState, useMemo } from "react";
import type { PdfRawRecord } from "@/lib/data";
import { CRIME_COLORS } from "@/lib/categories";

interface Props { records: PdfRawRecord[] }

const PROVINCES = ["Todas", "San José", "Alajuela", "Cartago", "Heredia", "Guanacaste", "Puntarenas", "Limón"];

export default function PdfsClient({ records }: Props) {
  const [province, setProvince] = useState("Todas");
  const [crimeType, setCrimeType] = useState("todos");
  const [yearStr, setYearStr]   = useState("todos");
  const [page, setPage]          = useState(1);
  const PER_PAGE = 50;

  const years      = useMemo(() => ["todos", ...Array.from(new Set(records.map((r) => String(r.year)))).sort().reverse()], [records]);
  const crimeTypes = useMemo(() => ["todos", ...Array.from(new Set(records.map((r) => r.crimeType))).sort()], [records]);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (province !== "Todas" && r.province !== province) return false;
      if (crimeType !== "todos" && r.crimeType !== crimeType) return false;
      if (yearStr   !== "todos" && String(r.year) !== yearStr) return false;
      return true;
    });
  }, [records, province, crimeType, yearStr]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const pageRecords = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const reset = () => setPage(1);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={province}
          onChange={(e) => { setProvince(e.target.value); reset(); }}
          className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-slate-500"
        >
          {PROVINCES.map((p) => <option key={p}>{p}</option>)}
        </select>
        <select
          value={crimeType}
          onChange={(e) => { setCrimeType(e.target.value); reset(); }}
          className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-slate-500"
        >
          {crimeTypes.map((ct) => <option key={ct}>{ct}</option>)}
        </select>
        <select
          value={yearStr}
          onChange={(e) => { setYearStr(e.target.value); reset(); }}
          className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-slate-500"
        >
          {years.map((y) => <option key={y}>{y}</option>)}
        </select>
        <span className="ml-auto flex items-center text-xs text-slate-500 tabular-nums">
          {filtered.length.toLocaleString("es-CR")} registros
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-900/80 text-slate-500 border-b border-slate-800">
                <th className="text-left px-3 py-2.5 font-medium">Año</th>
                <th className="text-left px-3 py-2.5 font-medium">Período</th>
                <th className="text-left px-3 py-2.5 font-medium">Provincia</th>
                <th className="text-left px-3 py-2.5 font-medium">Cantón</th>
                <th className="text-left px-3 py-2.5 font-medium">Delito</th>
                <th className="text-right px-3 py-2.5 font-medium">Conteo</th>
                <th className="text-left px-3 py-2.5 font-medium hidden sm:table-cell">Fuente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {pageRecords.map((r, i) => (
                <tr key={i} className="text-slate-400 hover:bg-slate-800/30 transition-colors">
                  <td className="px-3 py-2 tabular-nums">{r.year}</td>
                  <td className="px-3 py-2 text-slate-500">{r.period}</td>
                  <td className="px-3 py-2">{r.province}</td>
                  <td className="px-3 py-2 text-slate-500">{r.canton ?? "—"}</td>
                  <td className="px-3 py-2">
                    <span className="font-medium" style={{ color: CRIME_COLORS[r.crimeType] ?? "#94a3b8" }}>
                      {r.crimeType}
                    </span>
                  </td>
                  <td className="px-3 py-2 tabular-nums text-right text-slate-300 font-medium">{r.count.toLocaleString("es-CR")}</td>
                  <td className="px-3 py-2 font-mono text-[10px] text-slate-600 hidden sm:table-cell truncate max-w-[180px]">{r.sourceFile}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Página {page} de {totalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded border border-slate-700 hover:border-slate-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Anterior
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded border border-slate-700 hover:border-slate-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
