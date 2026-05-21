import type { Metadata } from "next";
import Link from "next/link";
import { Database, FileText, AlertTriangle, CheckCircle, ExternalLink, BarChart3, Map } from "lucide-react";

export const metadata: Metadata = {
  title: "Metodología",
  description: "Fuentes de datos, proceso de extracción y limitaciones metodológicas del Atlas Criminal Costa Rica.",
};

export default function MetodologiaPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">

      <div className="mb-10">
        <p className="text-xs text-red-400 uppercase tracking-widest font-semibold mb-2">Transparencia metodológica</p>
        <h1 className="text-3xl font-black text-white mb-3">Metodología y Fuentes</h1>
        <p className="text-slate-400 leading-relaxed">
          Todo dato en esta plataforma proviene de publicaciones oficiales. En esta página explicamos
          exactamente de dónde vienen los datos, cómo los procesamos y cuáles son sus limitaciones.
        </p>
      </div>

      {/* Sources */}
      <section className="mb-10">
        <SectionHeading Icon={Database} title="Fuentes de datos" />
        <div className="grid sm:grid-cols-2 gap-4">
          <SourceCard
            badge="Primaria"
            badgeColor="emerald"
            name="Observatorio de la Violencia"
            org="Ministerio de Justicia y Paz de Costa Rica"
            description="Atlas de Criminalidad en PDF con conteos anuales de delitos por provincia y cantón. Cubre 2023–2025."
            dataType="Conteos absolutos"
            format="PDF (extracción automatizada con Python + pdfplumber)"
          />
          <SourceCard
            badge="Primaria"
            badgeColor="emerald"
            name="Anexos Estadísticos OIJ"
            org="Organismo de Investigación Judicial"
            description="Archivos Excel con tasas de criminalidad por 10,000 habitantes por provincia. Cubre 2018–2022."
            dataType="Tasas / 10,000 hab."
            format="Excel .xlsx (procesado con biblioteca xlsx)"
          />
          <SourceCard
            badge="Auxiliar"
            badgeColor="slate"
            name="Proyecciones de Población"
            org="INEC — Instituto Nacional de Estadística y Censos"
            description="Datos de población provincial y cantonal para calcular tasas por 100,000 habitantes."
            dataType="Población estimada"
            format="Incorporado en los anexos del OIJ"
          />
        </div>
      </section>

      {/* Pipeline */}
      <section className="mb-10">
        <SectionHeading Icon={BarChart3} title="Proceso de extracción y procesamiento" />
        <div className="space-y-3">
          {[
            { step: "1", title: "Descarga automática", desc: "Un scraper en TypeScript (Cheerio) revisa periódicamente el sitio del Observatorio de la Violencia y descarga los PDF y Excel publicados." },
            { step: "2", title: "Extracción de PDFs", desc: "Un script Python con pdfplumber analiza la estructura tabular de los Atlas de Criminalidad y extrae los conteos por tipo de delito, provincia y año." },
            { step: "3", title: "Normalización", desc: "Un procesador TypeScript unifica las estructuras de Excel (tasas) y PDF (conteos) en un esquema común, asignando unidades correctas a cada registro." },
            { step: "4", title: "Geocodificación", desc: "Los nombres de provincia y cantón se mapean a identificadores estándar (códigos INEC) para permitir visualización cartográfica." },
            { step: "5", title: "Publicación", desc: "Los datos procesados se almacenan como archivos JSON en /public/data/ y se sirven directamente desde el servidor Next.js sin base de datos externa." },
          ].map((s) => (
            <div key={s.step} className="flex gap-4 rounded-lg border border-slate-800 bg-slate-900/40 p-4">
              <span className="w-7 h-7 rounded-full bg-red-600/20 border border-red-900/50 text-red-400 text-xs font-bold flex items-center justify-center shrink-0">{s.step}</span>
              <div>
                <p className="text-sm font-semibold text-white mb-0.5">{s.title}</p>
                <p className="text-xs text-slate-400 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Limitations */}
      <section className="mb-10">
        <SectionHeading Icon={AlertTriangle} title="Limitaciones importantes" />
        <div className="space-y-3">
          {(([
            {
              level: "critical",
              title: "Cambio de metodología 2022/2023",
              desc: "Los datos 2018–2022 son tasas por 10,000 habitantes (Excel OIJ) y los datos 2023–2025 son conteos absolutos (PDF Atlas). Estas dos series NO son directamente comparables. La plataforma las visualiza por separado y las etiqueta claramente.",
            },
            {
              level: "warning",
              title: "Cifra negra (sub-registro)",
              desc: "Los datos representan delitos denunciados y registrados por el OIJ. Un número significativo de delitos nunca se denuncia, especialmente violencia doméstica, robos menores y violaciones. La realidad criminalística supera los datos disponibles.",
            },
            {
              level: "warning",
              title: "Cambios en clasificación de delitos",
              desc: "Las categorías de delito pueden haber cambiado entre períodos. Comparaciones inter-anuales deben hacerse con cautela, especialmente en categorías como 'narcotráfico' que abarcan múltiples tipos de infracción.",
            },
            {
              level: "info",
              title: "Período anual vs. semestral",
              desc: "Algunos años disponibles corresponden a datos del primer semestre. Cuando sea el caso, la etiqueta del período lo indica explícitamente (ej. 'Ene–Jun 2024'). No se extrapolan cifras anuales a partir de datos parciales.",
            },
            {
              level: "info",
              title: "Datos de cantones",
              desc: "La cobertura a nivel cantonal es parcial. No todos los cantones tienen datos para todos los años ni para todas las categorías de delito.",
            },
          ] as { level: "critical" | "warning" | "info"; title: string; desc: string }[])).map((l, i) => (
            <LimitationCard key={i} {...l} />
          ))}
        </div>
      </section>

      {/* Data quality */}
      <section className="mb-10">
        <SectionHeading Icon={CheckCircle} title="Garantías de calidad" />
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            "Los datos se publican sin modificación numérica respecto a las fuentes originales",
            "Cada registro incluye metadatos de origen (fuente, año, unidad de medida)",
            "El código de procesamiento es público y auditable en GitHub",
            "Las visualizaciones etiquetan claramente el tipo de dato (conteo vs. tasa)",
            "Las comparaciones inter-temporales solo se muestran cuando las series son compatibles",
            "La variación interanual se calcula solo para series de la misma fuente y metodología",
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2.5 rounded-lg border border-slate-800 bg-slate-900/40 p-3">
              <CheckCircle size={14} className="text-emerald-500 mt-0.5 shrink-0" />
              <p className="text-xs text-slate-400 leading-relaxed">{item}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Official links */}
      <section className="mb-10">
        <SectionHeading Icon={ExternalLink} title="Acceso a fuentes primarias" />
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            Recomendamos consultar siempre las fuentes primarias para análisis críticos. Esta plataforma
            facilita la exploración de datos públicos; para decisiones de política pública o investigación
            académica, descargue los documentos originales del Observatorio de la Violencia.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/fuentes" className="btn-primary text-xs py-2 px-4">Ver todas las fuentes →</Link>
            <Link href="/datos" className="btn-outline text-xs py-2 px-4">Explorar datos brutos</Link>
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-5">
        <p className="text-xs font-semibold text-amber-400 mb-2">Aviso importante</p>
        <p className="text-xs text-slate-400 leading-relaxed">
          Esta plataforma es un proyecto independiente, sin fines comerciales, y no está afiliada al
          Organismo de Investigación Judicial (OIJ), al Ministerio de Justicia y Paz, al INEC ni a
          ninguna otra institución gubernamental costarricense. Los datos son de dominio público y se
          reproducen con fines de transparencia, educación y análisis ciudadano.
        </p>
      </div>

    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionHeading({ Icon, title }: { Icon: React.ComponentType<{ size?: number; className?: string }>; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon size={16} className="text-red-500" />
      <h2 className="text-sm font-semibold text-white uppercase tracking-wider">{title}</h2>
    </div>
  );
}

function SourceCard({
  badge, badgeColor, name, org, description, dataType, format,
}: {
  badge: string; badgeColor: "emerald" | "slate";
  name: string; org: string; description: string; dataType: string; format: string;
}) {
  const badgeCls = badgeColor === "emerald"
    ? "border-emerald-800 text-emerald-400 bg-emerald-950/50"
    : "border-slate-700 text-slate-400 bg-slate-800/50";
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
      <span className={`inline-flex text-[10px] font-semibold uppercase tracking-wider rounded-full border px-2 py-0.5 mb-3 ${badgeCls}`}>{badge}</span>
      <h3 className="text-sm font-bold text-white mb-0.5">{name}</h3>
      <p className="text-xs text-slate-500 mb-3">{org}</p>
      <p className="text-xs text-slate-400 leading-relaxed mb-3">{description}</p>
      <div className="space-y-1">
        <p className="text-[10px] text-slate-600"><strong className="text-slate-500">Tipo:</strong> {dataType}</p>
        <p className="text-[10px] text-slate-600"><strong className="text-slate-500">Formato:</strong> {format}</p>
      </div>
    </div>
  );
}

function LimitationCard({
  level, title, desc,
}: {
  level: "critical" | "warning" | "info"; title: string; desc: string;
}) {
  const cls = level === "critical"
    ? "border-red-900/50 bg-red-950/20"
    : level === "warning"
    ? "border-amber-900/40 bg-amber-950/10"
    : "border-slate-800 bg-slate-900/40";
  const iconCls = level === "critical" ? "text-red-400" : level === "warning" ? "text-amber-400" : "text-slate-400";
  return (
    <div className={`rounded-lg border p-4 ${cls}`}>
      <div className="flex items-start gap-2.5">
        <AlertTriangle size={14} className={`${iconCls} mt-0.5 shrink-0`} />
        <div>
          <p className="text-sm font-semibold text-white mb-1">{title}</p>
          <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
        </div>
      </div>
    </div>
  );
}
