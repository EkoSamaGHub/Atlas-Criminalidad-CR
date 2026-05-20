"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { CATEGORIES, PROVINCES, type CrimeCategory } from "@/lib/mockData";

const CrimeMap = dynamic(() => import("@/components/CrimeMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-950">
      <div className="text-slate-400 text-sm animate-pulse">Cargando mapa...</div>
    </div>
  ),
});

export default function AtlasPage() {
  const [category, setCategory] = useState<CrimeCategory>("homicidio");

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Filter bar */}
      <div className="border-b border-slate-800 bg-slate-900/80 px-4 py-2.5 flex items-center gap-3 flex-wrap shrink-0">
        <span className="text-xs text-slate-500 font-medium uppercase tracking-wider mr-1">Delito:</span>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setCategory(cat.key)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
              category === cat.key
                ? "text-white border-transparent"
                : "text-slate-400 border-slate-700 hover:border-slate-500"
            }`}
            style={category === cat.key ? { background: cat.color, borderColor: cat.color } : {}}
          >
            {cat.label}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-4 text-xs text-slate-500">
          <span>7 provincias</span>
          <span className="border-l border-slate-700 pl-4">Datos 2024</span>
        </div>
      </div>

      {/* Map + sidebar layout */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative">
          <CrimeMap selectedCategory={category} />
        </div>

        {/* Province sidebar */}
        <div className="w-64 border-l border-slate-800 bg-slate-900/60 overflow-y-auto shrink-0 hidden lg:block">
          <div className="p-3 border-b border-slate-800">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">
              Ranking por tasa
            </p>
          </div>
          <div className="divide-y divide-slate-800/60">
            {[...PROVINCES]
              .sort((a, b) => b.crimes[category] - a.crimes[category])
              .map((p, i) => {
                const max = Math.max(...PROVINCES.map((x) => x.crimes[category]));
                const pct = (p.crimes[category] / max) * 100;
                return (
                  <div key={p.code} className="px-3 py-2.5 hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-600 w-4">{i + 1}</span>
                        <span className="text-sm text-slate-200">{p.name}</span>
                      </div>
                      <span className="text-xs font-semibold text-slate-200">
                        {p.crimes[category].toLocaleString("es-CR")}
                      </span>
                    </div>
                    <div className="w-full h-1 rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          background: CATEGORIES.find((c) => c.key === category)?.color ?? "#ef4444",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
