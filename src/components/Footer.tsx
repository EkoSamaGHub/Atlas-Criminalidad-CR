import Link from "next/link";
import { ShieldAlert, Code2, ExternalLink, Coffee, Globe } from "lucide-react";

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
              Atlas Criminalidad <span className="text-red-500">CR</span>
            </span>
          </Link>
          <p className="text-xs text-slate-500 leading-relaxed">
            Plataforma independiente de análisis geoespacial de la criminalidad en Costa Rica.
            Sin fines comerciales.
          </p>
          <p className="text-xs text-slate-600 mt-3">
            © {year} · Proyecto de código abierto
          </p>
          <a
            href="https://ko-fi.com/ekodev"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-4 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs hover:bg-amber-500/20 transition-colors"
          >
            <Coffee size={12} />
            Apoya en Ko-fi
          </a>
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
              { href: "/pdfs",        label: "Datos PDF (Experimental)" },
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

      {/* Tech stack */}
      <div className="border-t border-slate-800/40 max-w-7xl mx-auto px-6 py-6">
        <p className="text-[10px] text-slate-600 uppercase tracking-widest font-medium mb-4">Stack tecnológico</p>
        <div className="flex flex-wrap gap-y-3 gap-x-6">
          {[
            {
              label: "Frontend",
              color: "text-blue-400 border-blue-900/60 bg-blue-950/30",
              items: ["Next.js 15", "React 19", "TypeScript", "Tailwind CSS 4", "Lucide Icons"],
            },
            {
              label: "Mapas & Gráficos",
              color: "text-cyan-400 border-cyan-900/60 bg-cyan-950/30",
              items: ["Leaflet", "React Leaflet", "Recharts", "GeoJSON"],
            },
            {
              label: "Inteligencia Artificial",
              color: "text-violet-400 border-violet-900/60 bg-violet-950/30",
              items: ["Anthropic Claude API", "claude-sonnet-4-6"],
            },
            {
              label: "Procesamiento de datos",
              color: "text-amber-400 border-amber-900/60 bg-amber-950/30",
              items: ["Python 3", "pdfplumber", "Node.js", "XLSX", "Cheerio"],
            },
            {
              label: "Infraestructura",
              color: "text-emerald-400 border-emerald-900/60 bg-emerald-950/30",
              items: ["Vercel", "GitHub", "GitHub Actions", "CI/CD semanal"],
            },
            {
              label: "Privacidad & Seguridad",
              color: "text-slate-400 border-slate-700/60 bg-slate-800/30",
              items: ["Sin cookies", "Sin tracking", "Sin publicidad", "Código abierto"],
            },
          ].map((group) => (
            <div key={group.label} className="flex items-start gap-2 flex-wrap">
              <span className="text-[10px] text-slate-600 pt-0.5 shrink-0 w-24">{group.label}</span>
              <div className="flex flex-wrap gap-1.5">
                {group.items.map((item) => (
                  <span
                    key={item}
                    className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${group.color}`}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-800/60 max-w-7xl mx-auto px-6 py-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] text-slate-600">
          Datos: 2018–2025 · OIJ / Observatorio de la Violencia MJP
        </p>
        <div className="flex items-center gap-4">
          <a
            href="https://eko-dev-page.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[10px] text-slate-600 hover:text-slate-400 transition-colors"
          >
            <Globe size={12} />
            eko-dev-page.vercel.app
          </a>
          <a
            href="https://github.com/EkoSamaGHub/atlas-criminalidad-cr"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[10px] text-slate-600 hover:text-slate-400 transition-colors"
          >
            <Code2 size={12} />
            Código abierto en GitHub
          </a>
          <a
            href="/admin"
            className="flex items-center gap-1.5 text-[10px] text-slate-700 hover:text-slate-500 transition-colors"
          >
            Admin
          </a>
        </div>
      </div>
    </footer>
  );
}
