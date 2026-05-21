"use client";
import { useState, useMemo, useCallback } from "react";
import type { CrimeRecord, DataStats } from "@/lib/data";
import { CRIME_COLORS } from "@/lib/categories";

const CRIME_LABELS: Record<string, string> = {
  homicidio: "Homicidio",
  robo: "Robo",
  hurto: "Hurto",
  narcotrafico: "Narcotráfico",
  violacion: "Violación",
  agresion: "Agresión",
  extorsion: "Extorsión",
  penalizacion_violencia: "Penalización de la violencia",
  violencia_domestica: "Violencia doméstica",
};

function crimeLabel(key: string): string {
  return CRIME_LABELS[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const PAGE_SIZE = 100;

type SortKey = keyof CrimeRecord;

export default function DataExplorer({ records, stats }: { records: CrimeRecord[]; stats: DataStats }) {
  const [yearFilter,   setYearFilter]   = useState<number[]>([]);
  const [provFilter,   setProvFilter]   = useState<string[]>([]);
  const [crimeFilter,  setCrimeFilter]  = useState<string[]>([]);
  const [periodFilter, setPeriodFilter] = useState<string[]>([]);
  const [unitFilter,   setUnitFilter]   = useState<string[]>([]);
  const [search,       setSearch]       = useState("");
  const [sortKey,      setSortKey]      = useState<SortKey>("year");
  const [sortAsc,      setSortAsc]      = useState(false);
  const [page,         setPage]         = useState(1);

  const allYears   = useMemo(() => [...new Set(records.map((r) => r.year))].sort((a, b) => b - a), [records]);
  const allProvs   = useMemo(() => [...new Set(records.map((r) => r.province))].sort(), [records]);
  const allCrimes  = useMemo(() => [...new Set(records.map((r) => r.crimeType))].sort(), [records]);
  const allPeriods = useMemo(() => [...new Set(records.map((r) => r.period))].sort(), [records]);
  const allUnits   = useMemo(() => [...new Set(records.map((r) => r.unit ?? "count"))].sort(), [records]);

  const filtered = useMemo(() => {
    let r = records;
    if (yearFilter.length)   r = r.filter((x) => yearFilter.includes(x.year));
    if (provFilter.length)   r = r.filter((x) => provFilter.includes(x.province));
    if (crimeFilter.length)  r = r.filter((x) => crimeFilter.includes(x.crimeType));
    if (periodFilter.length) r = r.filter((x) => periodFilter.includes(x.period));
    if (unitFilter.length)   r = r.filter((x) => unitFilter.includes(x.unit ?? "count"));
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((x) =>
        x.province.toLowerCase().includes(q) ||
        (x.canton ?? "").toLowerCase().includes(q) ||
        (x.district ?? "").toLowerCase().includes(q) ||
        x.crimeType.toLowerCase().includes(q) ||
        x.source.toLowerCase().includes(q)
      );
    }
    return [...r].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortAsc ? cmp : -cmp;
    });
  }, [records, yearFilter, provFilter, crimeFilter, periodFilter, unitFilter, search, sortKey, sortAsc]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const countOnlyTotal = filtered.filter((r) => (r.unit ?? "count") === "count").reduce((s, r) => s + r.count, 0);
  const hasRateRecords = filtered.some((r) => r.unit === "rate_per_10k");

  const sort = (key: SortKey) => {
    if (key === sortKey) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(false); }
    setPage(1);
  };

  const toggleArr = <T,>(arr: T[], val: T, set: (v: T[]) => void) => {
    set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
    setPage(1);
  };

  const exportCSV = useCallback(() => {
    const header = ["year","period","province","canton","district","crimeType","count","unit","source"];
    const rows = filtered.map((r) =>
      [r.year, r.period, `"${r.province}"`, `"${r.canton ?? ""}"`, `"${r.district ?? ""}"`, r.crimeType, r.count, r.unit ?? "count", `"${r.source}"`].join(",")
    );
    const blob = new Blob([header.join(",") + "\n" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "oij_atlas_datos.csv";
    a.click(); URL.revokeObjectURL(url);
  }, [filtered]);

  const Th = ({ label, k }: { label: string; k: SortKey }) => (
    <th className="px-3 py-3 font-medium cursor-pointer hover:text-white transition-colors select-none whitespace-nowrap"
      onClick={() => sort(k)}>
      {label}{sortKey === k ? (sortAsc ? " ↑" : " ↓") : ""}
    </th>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Explorador de Datos</h1>
          <p className="text-slate-400 text-sm mt-1">
            {records.length.toLocaleString("es-CR")} registros totales ·{" "}
            {filtered.length.toLocaleString("es-CR")} filtrados ·{" "}
            {countOnlyTotal.toLocaleString("es-CR")} delitos contabilizados
            {hasRateRecords && <span className="text-amber-500/80 text-xs ml-1">(excluye tasas /10k)</span>}
          </p>
        </div>
        <button onClick={exportCSV}
          className="flex items-center gap-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 text-sm font-medium px-4 py-2 transition-colors">
          ↓ Exportar CSV ({filtered.length.toLocaleString("es-CR")} filas)
        </button>
      </div>

      {/* Filters */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div className="lg:col-span-4">
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por provincia, cantón, tipo de delito o fuente…"
            className="w-full rounded-lg border border-slate-700 bg-slate-900 text-slate-200 text-sm px-4 py-2.5 placeholder-slate-500 focus:outline-none focus:border-slate-500" />
        </div>

        {/* Year filter */}
        <FilterGroup label="Año" items={allYears.map(String)} active={yearFilter.map(String)}
          onToggle={(v) => toggleArr(yearFilter, Number(v), setYearFilter)}
          onClear={() => { setYearFilter([]); setPage(1); }} />

        {/* Province filter */}
        <FilterGroup label="Provincia" items={allProvs} active={provFilter}
          onToggle={(v) => toggleArr(provFilter, v, setProvFilter)}
          onClear={() => { setProvFilter([]); setPage(1); }} />

        {/* Crime type filter */}
        <FilterGroup label="Tipo de Delito" items={allCrimes} labels={crimeLabel} active={crimeFilter}
          onToggle={(v) => toggleArr(crimeFilter, v, setCrimeFilter)}
          onClear={() => { setCrimeFilter([]); setPage(1); }} colors={CRIME_COLORS} />

        {/* Period filter */}
        <FilterGroup label="Período" items={allPeriods} active={periodFilter}
          onToggle={(v) => toggleArr(periodFilter, v, setPeriodFilter)}
          onClear={() => { setPeriodFilter([]); setPage(1); }} />

        {/* Unit filter */}
        <FilterGroup
          label="Tipo de dato"
          items={allUnits.map((u) => u === "rate_per_10k" ? "Tasa /10k hab." : "Conteo real")}
          active={unitFilter.map((u) => u === "rate_per_10k" ? "Tasa /10k hab." : "Conteo real")}
          onToggle={(v) => {
            const unit = v === "Tasa /10k hab." ? "rate_per_10k" : "count";
            toggleArr(unitFilter, unit, setUnitFilter);
          }}
          onClear={() => { setUnitFilter([]); setPage(1); }}
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/60 text-slate-400 text-left sticky top-0">
            <tr>
              <Th label="Año"         k="year" />
              <Th label="Período"     k="period" />
              <Th label="Provincia"   k="province" />
              <Th label="Cantón ¹"    k="canton" />
              <Th label="Distrito ¹"  k="district" />
              <Th label="Tipo"        k="crimeType" />
              <Th label="Valor"       k="count" />
              <th className="px-3 py-3 font-medium whitespace-nowrap text-xs">Unidad</th>
              <Th label="Fuente"      k="source" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {visible.map((r, i) => (
              <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                <td className="px-3 py-2 tabular-nums text-slate-300">{r.year}</td>
                <td className="px-3 py-2 text-slate-400 text-xs whitespace-nowrap">{r.period}</td>
                <td className="px-3 py-2 font-medium text-white">{r.province}</td>
                <td className="px-3 py-2 text-slate-300">{r.canton ?? <span className="text-slate-600">—</span>}</td>
                <td className="px-3 py-2 text-slate-400 text-xs">{r.district ?? <span className="text-slate-700">—</span>}</td>
                <td className="px-3 py-2">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ background: (CRIME_COLORS[r.crimeType] ?? "#64748b") + "22", color: CRIME_COLORS[r.crimeType] ?? "#94a3b8" }}>
                    {crimeLabel(r.crimeType)}
                  </span>
                </td>
                <td className="px-3 py-2 font-semibold tabular-nums text-white text-right">
                  {r.count.toLocaleString("es-CR")}
                </td>
                <td className="px-3 py-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                    (r.unit ?? "count") === "count"
                      ? "border-emerald-800 text-emerald-400 bg-emerald-950/40"
                      : "border-amber-800 text-amber-400 bg-amber-950/40"
                  }`}>
                    {(r.unit ?? "count") === "count" ? "conteo" : "tasa/10k"}
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-500 text-xs font-mono truncate max-w-[140px]">{r.source}</td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-500">No hay registros con los filtros aplicados.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-400">
          <span>Página {page} de {totalPages} · mostrando {visible.length} de {filtered.length.toLocaleString("es-CR")}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(1)}           disabled={page === 1}          className="px-3 py-1 rounded border border-slate-700 hover:bg-slate-800 disabled:opacity-30">«</button>
            <button onClick={() => setPage((p) => p - 1)} disabled={page === 1}          className="px-3 py-1 rounded border border-slate-700 hover:bg-slate-800 disabled:opacity-30">‹</button>
            <button onClick={() => setPage((p) => p + 1)} disabled={page === totalPages} className="px-3 py-1 rounded border border-slate-700 hover:bg-slate-800 disabled:opacity-30">›</button>
            <button onClick={() => setPage(totalPages)}  disabled={page === totalPages} className="px-3 py-1 rounded border border-slate-700 hover:bg-slate-800 disabled:opacity-30">»</button>
          </div>
        </div>
      )}

      <div className="text-xs text-slate-600 space-y-0.5">
        <p>Datos del Observatorio de la Violencia, Ministerio de Justicia y Paz de Costa Rica.
        Última actualización: {stats.generatedAt ? new Date(stats.generatedAt).toLocaleDateString("es-CR") : "N/A"}.</p>
        <p><sup>1</sup> Cantón y Distrito solo disponibles en registros con unidad &ldquo;Tasa /10k hab.&rdquo; (Anexos Estadísticos Excel 2018–2022). Los registros PDF muestran datos a nivel provincial.</p>
      </div>
    </div>
  );
}

function FilterGroup({ label, items, active, onToggle, onClear, colors, labels }: {
  label: string; items: string[]; active: string[];
  onToggle: (v: string) => void; onClear: () => void;
  colors?: Record<string, string>;
  labels?: (key: string) => string;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
        {active.length > 0 && (
          <button onClick={onClear} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Limpiar</button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => {
          const isActive = active.includes(item);
          const color = colors?.[item];
          return (
            <button key={item} onClick={() => onToggle(item)}
              className={`px-2 py-0.5 rounded-full text-xs border transition-all ${
                isActive ? "text-white" : "text-slate-500 border-slate-700 hover:border-slate-500"
              }`}
              style={isActive && color ? { borderColor: color, background: color + "22", color } : {}}>
              {labels ? labels(item) : item}
            </button>
          );
        })}
      </div>
    </div>
  );
}
