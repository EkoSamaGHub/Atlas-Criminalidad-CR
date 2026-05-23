import type { Metadata } from "next";
import { getPdfRawRecords, getDataHealth } from "@/lib/data";
import PdfsClient from "./PdfsClient";
import { AlertTriangle, FileText } from "lucide-react";

export const metadata: Metadata = { title: "Datos PDF — Experimental" };

export default function PdfsPage() {
  const { records, files } = getPdfRawRecords();
  const health = getDataHealth();
  const notExtracted = health.pdf.notExtracted.length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">

      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <div className="flex items-center gap-2.5 mb-2">
          <FileText size={18} className="text-amber-400" />
          <h1 className="text-xl font-bold text-white">Datos de Publicaciones PDF</h1>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-amber-800 bg-amber-950/50 text-amber-300 uppercase tracking-widest">
            Experimental
          </span>
        </div>
        <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
          Registros extraídos directamente de publicaciones PDF del Observatorio de la Violencia.
          Estos datos son <strong className="text-white">conteos absolutos</strong> (no tasas) y se mantienen
          completamente separados de los dashboards principales, que usan exclusivamente Anexos Excel.
        </p>
      </div>

      {/* Separation warning */}
      <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl border border-amber-800/60 bg-amber-950/20">
        <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="text-amber-300 font-medium mb-1">Separación de fuentes — por qué estos datos no están en los dashboards</p>
          <p className="text-slate-400 leading-relaxed text-xs">
            Los <strong className="text-slate-300">Anexos Excel (2018–2022)</strong> reportan{" "}
            <strong className="text-slate-300">tasas por cada 10,000 habitantes</strong>.
            Los <strong className="text-slate-300">Atlas PDF (2016–2025)</strong> reportan{" "}
            <strong className="text-slate-300">conteos absolutos</strong>.
            Mezclar ambos en el mismo gráfico o tabla produciría comparaciones sin sentido.
            El Dashboard, Cantones y Provincias usan solo datos Excel. Esta página muestra los PDF de forma independiente.
          </p>
        </div>
      </div>

      {/* Pipeline status strip */}
      <div className="grid sm:grid-cols-4 gap-3">
        {[
          { label: "PDFs extraídos",      value: files.length,     color: "text-emerald-400" },
          { label: "Registros totales",    value: records.length,   color: "text-white" },
          { label: "Años cubiertos",       value: [...new Set(records.map((r) => r.year))].sort((a, b) => a - b).join(", ") || "—", color: "text-slate-300" },
          { label: "PDFs pendientes",      value: notExtracted,     color: notExtracted > 0 ? "text-amber-400" : "text-emerald-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-0.5">{label}</p>
            <p className={`text-lg font-bold tabular-nums ${color}`}>{typeof value === "number" ? value.toLocaleString("es-CR") : value}</p>
          </div>
        ))}
      </div>

      {/* Source files list */}
      {files.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/60">
            <p className="text-sm font-medium text-white">Archivos fuente extraídos</p>
          </div>
          <div className="divide-y divide-slate-800/60">
            {files.map((f) => (
              <div key={f.filename} className="flex items-center justify-between px-4 py-2.5 text-xs">
                <span className="font-mono text-slate-400 truncate mr-4">{f.filename}</span>
                <div className="flex items-center gap-4 shrink-0 text-slate-500">
                  <span>{f.years.join(", ")}</span>
                  <span className={`font-medium tabular-nums ${f.records === 0 ? "text-red-400" : "text-slate-300"}`}>
                    {f.records === 0 ? "VACÍO" : `${f.records.toLocaleString()} registros`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {records.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 px-6 py-10 text-center">
          <FileText size={32} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm mb-1">No hay registros PDF extraídos todavía.</p>
          <p className="text-slate-600 text-xs">El pipeline de extracción PDF está incompleto. Los datos Excel siguen disponibles en el Dashboard.</p>
        </div>
      ) : (
        <PdfsClient records={records} />
      )}

    </div>
  );
}
