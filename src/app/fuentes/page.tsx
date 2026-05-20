import { getDataSources, getStats } from "@/lib/data";

export default function FuentesPage() {
  const sources = getDataSources();
  const stats   = getStats();

  const byYear: Record<number, typeof sources> = {};
  sources.forEach((s) => {
    const y = s.year ?? 0;
    if (!byYear[y]) byYear[y] = [];
    byYear[y].push(s);
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">

      {/* Header */}
      <div className="border-b border-slate-800 pb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Fuentes de Datos</h1>
        <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">
          Todos los datos provienen exclusivamente de publicaciones oficiales del{" "}
          <a href="https://observatorio.mj.go.cr" target="_blank" rel="noopener noreferrer"
            className="text-red-400 hover:text-red-300 underline underline-offset-2">
            Observatorio de la Violencia del Ministerio de Justicia y Paz de Costa Rica
          </a>.
          Se procesaron {stats.sourceFiles} archivos que contienen {stats.totalRecords.toLocaleString("es-CR")} registros
          cubriendo los años {stats.yearRange[0]}–{stats.yearRange[1]}.
        </p>
      </div>

      {/* Methodology */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
        <h2 className="text-base font-semibold text-white">Metodología de Recolección</h2>
        <div className="grid sm:grid-cols-3 gap-4 text-sm">
          {[
            { step: "01", title: "Scraping Excel", desc: "Se rastrean las 12 páginas de publicaciones del Observatorio. Los archivos XLS/XLSX (Anexos Estadísticos) se descargan automáticamente.", icon: "📥" },
            { step: "02", title: "Extracción PDF", desc: "Para los años sin Excel, se aplica pdfplumber para extraer tablas de datos de los Atlas y Anexos Estadísticos en PDF.", icon: "📄" },
            { step: "03", title: "Normalización", desc: "Los datos crudos se normalizan: nombres de provincias estandarizados, tipos de delito unificados, registros duplicados eliminados.", icon: "🔄" },
          ].map((m) => (
            <div key={m.step} className="flex gap-3">
              <span className="text-2xl shrink-0">{m.icon}</span>
              <div>
                <p className="font-medium text-white text-sm mb-1">{m.title}</p>
                <p className="text-slate-400 text-xs leading-relaxed">{m.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-slate-800 pt-4 grid sm:grid-cols-2 gap-4 text-xs text-slate-400">
          <div>
            <p className="font-medium text-slate-300 mb-1">Actualización automática</p>
            <p>Un workflow de GitHub Actions ejecuta el pipeline completo cada lunes a las 6 AM UTC. Si el Observatorio publica nuevos archivos, se incorporan automáticamente en el próximo despliegue.</p>
          </div>
          <div>
            <p className="font-medium text-slate-300 mb-1">Limitaciones conocidas</p>
            <p>Los datos del 2026 aún no están disponibles en formato tabular. Algunas publicaciones no tienen cobertura a nivel cantonal. Los totales acumulados suman todos los años disponibles.</p>
          </div>
        </div>
      </div>

      {/* Source files by year */}
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          <h2 className="text-base font-semibold text-white">Publicaciones ({sources.length})</h2>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Excel — datos tabulares</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />PDF — tablas extraídas</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-500 inline-block" />PDF — referencia</span>
          </div>
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

      {/* Attribution */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 text-xs text-slate-400 space-y-2">
        <p className="font-medium text-slate-300">Aviso de uso</p>
        <p>Esta plataforma es un proyecto independiente y no tiene afiliación oficial con el OIJ, el Ministerio de Justicia y Paz, ni ninguna otra institución del Estado costarricense. Los datos son de dominio público y se utilizan con fines informativos y analíticos.</p>
        <p>Para datos oficiales, consulte directamente el{" "}
          <a href="https://observatorio.mj.go.cr" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 underline underline-offset-2">
            Observatorio de la Violencia
          </a>.
        </p>
      </div>

    </div>
  );
}
