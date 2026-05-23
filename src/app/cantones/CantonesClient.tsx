"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import type { CantonData } from "@/lib/data";
import { CRIME_COLORS, provinceSlug } from "@/lib/categories";

const KNOWN_PROVINCES = new Set([
  "San José", "Alajuela", "Cartago", "Heredia", "Guanacaste", "Puntarenas", "Limón",
]);

const CRIME_LABELS: Record<string, string> = {
  homicidio: "Homicidio", robo: "Robo", hurto: "Hurto",
  narcotrafico: "Narcotráfico", violacion: "Violación",
  agresion: "Agresión", extorsion: "Extorsión",
};
function crimeLabel(k: string) {
  return CRIME_LABELS[k] ?? k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface Props {
  cantons: CantonData[];
  crimeTypes: string[];
  maxTotal: number;
}

export default function CantonesClient({ cantons, crimeTypes, maxTotal }: Props) {
  const [query, setQuery] = useState("");
  const [provinceFilter, setProvinceFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"total" | string>("total");

  const provinces = useMemo(
    () => [...new Set(cantons.map((c) => c.province))].filter((p) => KNOWN_PROVINCES.has(p)).sort(),
    [cantons]
  );

  const filtered = useMemo(() => {
    let list = cantons;
    if (provinceFilter) list = list.filter((c) => c.province === provinceFilter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (c) => c.canton.toLowerCase().includes(q) || c.province.toLowerCase().includes(q)
      );
    }
    if (sortBy !== "total") {
      list = [...list].sort((a, b) => (b.crimes[sortBy] ?? 0) - (a.crimes[sortBy] ?? 0));
    }
    return list;
  }, [cantons, query, provinceFilter, sortBy]);

  return (
    <div className="space-y-4">
      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar cantón o provincia…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-8 pr-8 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-500 transition-colors"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Province filter pills */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setProvinceFilter(null)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
              provinceFilter === null
                ? "bg-slate-700 border-slate-600 text-white"
                : "text-slate-500 border-slate-700 hover:text-slate-300"
            }`}
          >
            Todas
          </button>
          {provinces.map((p) => (
            <button
              key={p}
              onClick={() => setProvinceFilter(p === provinceFilter ? null : p)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                provinceFilter === p
                  ? "bg-red-900/60 border-red-700 text-red-300"
                  : "text-slate-500 border-slate-700 hover:text-slate-300"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Sort selector */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-300 focus:outline-none focus:border-slate-500 cursor-pointer"
        >
          <option value="total">Ordenar: Total</option>
          {crimeTypes.map((ct) => (
            <option key={ct} value={ct}>Ordenar: {crimeLabel(ct)}</option>
          ))}
        </select>
      </div>

      <p className="text-xs text-slate-600">
        {filtered.length} cantón{filtered.length !== 1 ? "es" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
        {query || provinceFilter ? " · " : ""}
        {query && <span className="text-slate-500">búsqueda: "{query}"</span>}
        {query && provinceFilter && " · "}
        {provinceFilter && <span className="text-slate-500">provincia: {provinceFilter}</span>}
      </p>

      {/* Table */}
      <div className="rounded-xl border border-slate-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/60 text-slate-400 text-left sticky top-0">
            <tr>
              <th className="px-3 py-3 font-medium w-8">#</th>
              <th className="px-4 py-3 font-medium">Cantón</th>
              <th className="px-4 py-3 font-medium">Provincia</th>
              {crimeTypes.map((ct) => (
                <th
                  key={ct}
                  className="px-3 py-3 font-medium text-center text-xs cursor-pointer hover:text-white transition-colors"
                  style={{ color: sortBy === ct ? (CRIME_COLORS[ct] ?? "#94a3b8") : undefined }}
                  onClick={() => setSortBy(ct)}
                >
                  {crimeLabel(ct)}
                </th>
              ))}
              <th
                className="px-4 py-3 font-medium text-right cursor-pointer hover:text-white transition-colors"
                onClick={() => setSortBy("total")}
              >
                Total {sortBy === "total" && "↓"}
              </th>
              <th className="px-4 py-3 font-medium">Barra</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filtered.map((c, i) => (
              <tr key={`${c.province}-${c.canton}`} className="hover:bg-slate-800/30 transition-colors">
                <td className="px-3 py-2.5 text-slate-600 text-xs tabular-nums">{i + 1}</td>
                <td className="px-4 py-2.5 font-medium text-white">{c.canton}</td>
                <td className="px-4 py-2.5 text-slate-400 text-xs">
                  {KNOWN_PROVINCES.has(c.province)
                    ? <Link href={`/provincias/${provinceSlug(c.province)}`}
                        className="hover:text-red-400 transition-colors">{c.province}</Link>
                    : <span className="text-slate-600">{c.province}</span>}
                </td>
                {crimeTypes.map((ct) => (
                  <td key={ct} className="px-3 py-2.5 text-center text-xs tabular-nums text-slate-300">
                    {(c.crimes[ct] ?? 0) > 0
                      ? <span style={{ color: sortBy === ct ? (CRIME_COLORS[ct] ?? undefined) : undefined }}>
                          {(c.crimes[ct] ?? 0).toLocaleString("es-CR")}
                        </span>
                      : <span className="text-slate-700">—</span>}
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

        {filtered.length === 0 && (
          <div className="py-12 text-center text-slate-500 text-sm">
            No se encontraron cantones para "{query}"
          </div>
        )}
      </div>
    </div>
  );
}
