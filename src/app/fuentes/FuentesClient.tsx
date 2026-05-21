"use client";
import { useState } from "react";
import type { ManifestEntry } from "@/lib/data";

export default function FuentesClient({ sources }: { sources: ManifestEntry[] }) {
  const [showRef, setShowRef] = useState(false);

  const dataSources = sources.filter((s) => !s.reference_only);
  const refSources  = sources.filter((s) => s.reference_only);
  const displayed   = showRef ? sources : dataSources;

  const byYear: Record<number, ManifestEntry[]> = {};
  displayed.forEach((s) => {
    const y = s.year ?? 0;
    if (!byYear[y]) byYear[y] = [];
    byYear[y].push(s);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <h2 className="text-base font-semibold text-white">
          Publicaciones ({displayed.length}{!showRef ? ` de ${sources.length}` : ""})
        </h2>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Excel</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />PDF datos</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-500 inline-block" />PDF ref.</span>
        </div>
        {refSources.length > 0 && (
          <button onClick={() => setShowRef((v) => !v)}
            className="ml-auto text-xs text-slate-500 hover:text-slate-300 border border-slate-700 rounded px-2.5 py-1 transition-colors">
            {showRef
              ? `Ocultar ${refSources.length} fuentes de referencia`
              : `Mostrar ${refSources.length} fuentes de referencia`}
          </button>
        )}
      </div>
      {Object.entries(byYear).sort(([a], [b]) => Number(b) - Number(a)).map(([year, files]) => (
        <div key={year}>
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">
            {year === "0" ? "Año desconocido" : year}
          </h3>
          <div className="space-y-2">
            {files.map((f) => {
              const isExcel = f.filename.endsWith(".json") && !f.filename.includes("_pdf");
              const isPdfData = f.sheets.includes("pdf_extracted");
              return (
                <div key={f.filename} className="rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3 flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white mb-0.5">{f.title}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${
                      isExcel
                        ? "border-emerald-800 text-emerald-400 bg-emerald-950/40"
                        : isPdfData
                        ? "border-purple-800 text-purple-400 bg-purple-950/40"
                        : "border-slate-700 text-slate-400 bg-slate-800/40"
                    }`}>
                      {isExcel ? "Excel" : isPdfData ? "PDF" : "PDF ref."}
                    </span>
                    {f.originalUrl && (
                      <a href={f.originalUrl} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-red-400 hover:text-red-300 transition-colors">
                        Fuente ↗
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
