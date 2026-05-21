import Link from "next/link";
import { ShieldAlert, Code2, ExternalLink } from "lucide-react";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-slate-800 bg-slate-950 mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-10 grid sm:grid-cols-3 gap-8">

        {/* Brand */}
        <div>
          <Link href="/" className="inline-flex items-center gap-2.5 mb-3">
            <span className="w-7 h-7 rounded-md bg-red-600 flex items-center justify-center shrink-0">
              <ShieldAlert size={14} className="text-white" />
            </span>
            <span className="font-semibold text-white text-sm">
              Atlas Criminal <span className="text-red-500">CR</span>
            </span>
          </Link>
          <p className="text-xs text-slate-500 leading-relaxed">
            Plataforma independiente de análisis geoespacial de la criminalidad en Costa Rica.
            Sin fines comerciales.
          </p>
          <p className="text-xs text-slate-600 mt-3">
            © {year} · Proyecto de código abierto
          </p>
        </div>

        {/* Navigation */}
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium mb-3">Plataforma</p>
          <ul className="space-y-2">
            {[
              { href: "/atlas",       label: "Atlas Interactivo" },
              { href: "/dashboard",   label: "Dashboard de Estadísticas" },
              { href: "/cantones",    label: "Cantones" },
              { href: "/analisis",    label: "Análisis con IA" },
              { href: "/datos",       label: "Explorador de Datos" },
              { href: "/metodologia", label: "Metodología" },
              { href: "/fuentes",     label: "Fuentes de Datos" },
            ].map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-xs text-slate-400 hover:text-white transition-colors">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Sources */}
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium mb-3">Fuentes oficiales</p>
          <ul className="space-y-2.5">
            <li className="flex items-start gap-2">
              <ExternalLink size={12} className="text-slate-600 mt-0.5 shrink-0" />
              <span className="text-xs text-slate-500 leading-tight">
                <strong className="text-slate-400">Observatorio de la Violencia</strong> —
                Ministerio de Justicia y Paz de Costa Rica
              </span>
            </li>
            <li className="flex items-start gap-2">
              <ExternalLink size={12} className="text-slate-600 mt-0.5 shrink-0" />
              <span className="text-xs text-slate-500 leading-tight">
                <strong className="text-slate-400">OIJ</strong> —
                Organismo de Investigación Judicial · Anexos Estadísticos
              </span>
            </li>
            <li className="flex items-start gap-2">
              <ExternalLink size={12} className="text-slate-600 mt-0.5 shrink-0" />
              <span className="text-xs text-slate-500 leading-tight">
                <strong className="text-slate-400">INEC</strong> —
                Instituto Nacional de Estadística y Censos · Datos de población
              </span>
            </li>
          </ul>
          <div className="mt-4 pt-4 border-t border-slate-800/60">
            <p className="text-[10px] text-slate-600 leading-relaxed">
              Esta plataforma no es gubernamental y no está afiliada al OIJ,
              al Ministerio de Justicia ni al INEC. Los datos son públicos y
              se reproducen con fines informativos y de transparencia.
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800/60 max-w-7xl mx-auto px-6 py-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] text-slate-600">
          Datos: 2018–2025 · OIJ / Observatorio de la Violencia MJP
        </p>
        <a
          href="https://github.com/EkoSamaGHub/OIJ-ATLAS"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[10px] text-slate-600 hover:text-slate-400 transition-colors"
        >
          <Code2 size={12} />
          Código abierto en GitHub
        </a>
      </div>
    </footer>
  );
}
