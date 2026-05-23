"use client";
import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import type { ProvinceData, CrimeCategory } from "@/lib/categories";
import type { DataStats } from "@/lib/data";
import { CATEGORIES, provinceSlug } from "@/lib/categories";
import Link from "next/link";

const CrimeMap = dynamic(() => import("@/components/CrimeMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-950">
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <div className="w-8 h-8 border-2 border-slate-600 border-t-red-500 rounded-full animate-spin" />
        <span className="text-sm">Cargando mapa...</span>
      </div>
    </div>
  ),
});

interface Props {
  provinces: ProvinceData[];
  stats: DataStats;
  yearData: Record<number, ProvinceData[]>;
  rateYears: number[];
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const W = 44, H = 14;
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * W},${H - ((v - min) / range) * H}`)
    .join(" ");
  return (
    <svg width={W} height={H} className="overflow-visible shrink-0">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function AtlasClient({ provinces: defaultProvinces, stats, yearData, rateYears }: Props) {
  const rateYearSet = new Set(rateYears);
  const [category, setCategory] = useState<CrimeCategory>("homicidio");
  const years = Object.keys(yearData).map(Number).sort((a, b) => a - b);
  const latestYear = years[years.length - 1] ?? (stats.countYearRange?.[1] ?? stats.yearRange[1]);
  const [selectedYear, setSelectedYear] = useState<number>(latestYear);

  const provinces = useMemo(
    () => yearData[selectedYear] ?? defaultProvinces,
    [selectedYear, yearData, defaultProvinces]
  );

  const sorted = [...provinces].sort((a, b) => (b.crimes[category] ?? 0) - (a.crimes[category] ?? 0));
  const maxVal = sorted[0]?.crimes[category] ?? 1;

  // Per-province sparkline data across years
  const sparkData = useMemo(() => {
    const map: Record<string, number[]> = {};
    for (const yr of years) {
      for (const p of yearData[yr] ?? []) {
        if (!map[p.name]) map[p.name] = [];
        map[p.name].push(p.crimes[category] ?? 0);
      }
    }
    return map;
  }, [years, yearData, category]);

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">

      {/* Filter bar */}
      <div className="border-b border-slate-800 bg-slate-900/80 backdrop-blur px-4 py-2.5 flex items-center gap-3 flex-wrap shrink-0">
        <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Delito:</span>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setCategory(cat.key as CrimeCategory)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
              category === cat.key
                ? "text-white border-transparent"
                : "text-slate-400 border-slate-700 hover:border-slate-500 hover:text-slate-300"
            }`}
            style={category === cat.key ? { background: cat.color, borderColor: cat.color } : {}}
          >
            {cat.label}
          </button>
        ))}

        {/* Year selector */}
        {years.length > 1 && (
          <>
            <div className="w-px h-4 bg-slate-700 mx-1" />
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Año:</span>
            {years.map((yr) => {
              const isRate = rateYearSet.has(yr);
              return (
                <button
                  key={yr}
                  onClick={() => setSelectedYear(yr)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                    selectedYear === yr
                      ? isRate
                        ? "bg-amber-700/60 border-amber-600 text-amber-200"
                        : "bg-slate-600 border-slate-500 text-white"
                      : "text-slate-500 border-slate-700 hover:border-slate-500 hover:text-slate-300"
                  }`}
                  title={isRate ? "Tasa por 10,000 hab." : "Conteos reales"}
                >
                  {yr}{isRate && <span className="ml-1 opacity-60 text-[9px]">tasa</span>}
                </button>
              );
            })}
          </>
        )}

        <div className="ml-auto flex items-center gap-4 text-xs text-slate-500">
          <span>7 provincias · {stats.cantonCount} cantones</span>
          <span className="border-l border-slate-700 pl-4">
            {rateYearSet.has(selectedYear)
              ? `Datos ${selectedYear} · tasas /10k hab.`
              : `Datos ${selectedYear} · conteos reales`}
          </span>
          <Link href="/dashboard" className="text-red-400 hover:text-red-300 font-medium">Dashboard →</Link>
        </div>
      </div>

      {/* Map + sidebar layout */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative">
          <CrimeMap selectedCategory={category} provinces={provinces} />
        </div>

        {/* Province sidebar */}
        <div className="w-64 border-l border-slate-800 bg-slate-900/60 overflow-y-auto shrink-0 hidden lg:flex flex-col">
          <div className="p-3 border-b border-slate-800 sticky top-0 bg-slate-900/80 backdrop-blur">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">
              Ranking provincial · {CATEGORIES.find(c => c.key === category)?.label}
            </p>
          </div>
          <div className="divide-y divide-slate-800/60 flex-1">
            {sorted.map((p, i) => {
              const val = p.crimes[category] ?? 0;
              const pct = (val / maxVal) * 100;
              const cat = CATEGORIES.find((c) => c.key === category);
              const spark = sparkData[p.name] ?? [];
              return (
                <Link
                  key={p.code}
                  href={`/provincias/${provinceSlug(p.name)}`}
                  className="block px-3 py-2.5 hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-600 w-5 shrink-0">{i + 1}</span>
                      <span className="text-sm text-slate-200 font-medium">{p.name}</span>
                    </div>
                    <span className="text-xs font-bold tabular-nums" style={{ color: cat?.color }}>
                      {val.toLocaleString("es-CR")}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(pct, 2)}%`, background: cat?.color ?? "#ef4444" }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[10px] text-slate-600">Tasa /100k: {p.rate}</span>
                    {spark.length >= 2 ? (
                      <Sparkline values={spark} color={cat?.color ?? "#ef4444"} />
                    ) : (
                      <span className={`text-[10px] font-medium ${p.trend > 0 ? "text-red-400" : p.trend < 0 ? "text-emerald-400" : "text-slate-600"}`}>
                        {p.trend !== 0 ? `${p.trend > 0 ? "+" : ""}${p.trend}%` : ""}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
          <div className="p-3 border-t border-slate-800 bg-slate-900/60">
            <Link href="/cantones" className="text-xs text-red-400 hover:text-red-300">Ver rankings por cantón →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
