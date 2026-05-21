"use client";

import { useState, useRef } from "react";
import type { YearTrendPoint, CantonData, ProvinceData, DataStats } from "@/lib/data";
import { CRIME_COLORS } from "@/lib/categories";

interface Props {
  stats: DataStats;
  trend: YearTrendPoint[];
  provinces: ProvinceData[];
  cantons: CantonData[];
  crimeTotals: Record<string, number>;
  isReal: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderMarkdown(text: string): React.ReactNode[] {
  return text.split("\n").map((line, i) => {
    // Bold: **text**
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={j} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
    return (
      <p key={i} className={`${line.startsWith("  ") ? "ml-4" : ""} ${line === "" ? "mt-2" : ""}`}>
        {parts}
      </p>
    );
  });
}

// ── Interesting facts (derived from data, no AI) ──────────────────────────────

function computeFacts(provinces: ProvinceData[], cantons: CantonData[], crimeTotals: Record<string, number>, trend: YearTrendPoint[]) {
  const sortedByRate = [...provinces].sort((a, b) => b.rate - a.rate);
  const highestProvince = sortedByRate[0];
  const lowestProvince  = sortedByRate[sortedByRate.length - 1];

  const topCrimeEntry = Object.entries(crimeTotals).sort((a, b) => b[1] - a[1])[0];
  const totalCrimes   = Object.values(crimeTotals).reduce((s, v) => s + v, 0);

  const countTrend = trend.filter((p) => p.unit === "count").sort((a, b) => a.year - b.year);
  let trendNote = "";
  if (countTrend.length >= 2) {
    const last  = countTrend[countTrend.length - 1];
    const prev  = countTrend[countTrend.length - 2];
    const pct   = prev.total > 0 ? (((last.total - prev.total) / prev.total) * 100).toFixed(1) : "0";
    const dir   = last.total > prev.total ? "aumento" : "disminución";
    trendNote = `${dir === "aumento" ? "+" : ""}${pct}% de ${prev.year} a ${last.year}`;
  }

  const topCanton = cantons[0];

  const narco = crimeTotals["narcotrafico"] ?? 0;
  const narcoPct = totalCrimes > 0 ? ((narco / totalCrimes) * 100).toFixed(1) : "0";

  return [
    {
      icon: "📍",
      label: "Provincia más afectada",
      value: highestProvince?.name ?? "—",
      detail: highestProvince ? `${highestProvince.rate.toLocaleString("es-CR")} delitos por cada 100,000 hab.` : "",
      color: "#ef4444",
    },
    {
      icon: "🛡️",
      label: "Provincia más segura",
      value: lowestProvince?.name ?? "—",
      detail: lowestProvince ? `${lowestProvince.rate.toLocaleString("es-CR")} delitos /100k hab.` : "",
      color: "#22c55e",
    },
    {
      icon: "📊",
      label: "Delito más frecuente",
      value: topCrimeEntry ? topCrimeEntry[0].charAt(0).toUpperCase() + topCrimeEntry[0].slice(1) : "—",
      detail: topCrimeEntry ? `${topCrimeEntry[1].toLocaleString("es-CR")} casos registrados` : "",
      color: CRIME_COLORS[topCrimeEntry?.[0] ?? ""] ?? "#64748b",
    },
    {
      icon: "🏙️",
      label: "Cantón con más delitos",
      value: topCanton ? topCanton.canton : "—",
      detail: topCanton ? `${topCanton.total.toLocaleString("es-CR")} delitos · ${topCanton.province}` : "",
      color: "#f97316",
    },
    {
      icon: "📈",
      label: "Tendencia reciente",
      value: trendNote || "Sin datos comparables",
      detail: countTrend.length >= 2
        ? `${countTrend[countTrend.length - 1].total.toLocaleString("es-CR")} delitos en ${countTrend[countTrend.length - 1].year}`
        : "",
      color: trendNote.startsWith("+") ? "#ef4444" : "#22c55e",
    },
    {
      icon: "💊",
      label: "Narcotráfico del total",
      value: `${narcoPct}%`,
      detail: `${narco.toLocaleString("es-CR")} casos de narcotráfico registrados`,
      color: "#8b5cf6",
    },
  ];
}

// ── Suggested questions ───────────────────────────────────────────────────────

const SUGGESTED_QUESTIONS = [
  "¿Cuál es la provincia con mayor tasa de homicidios y cuánto ha cambiado en los últimos años?",
  "¿Qué tendencia sigue el narcotráfico en Costa Rica según los datos disponibles?",
  "¿Cuáles son las diferencias de criminalidad entre el Gran Área Metropolitana y las regiones costeras?",
  "¿Cuál es el cantón más seguro según los datos y qué lo distingue?",
  "¿Ha mejorado o empeorado la seguridad ciudadana en los últimos años según los datos?",
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function AnalisisClient({ stats, trend, provinces, cantons, crimeTotals, isReal }: Props) {
  const [analysisText, setAnalysisText] = useState("");
  const [loading, setLoading]           = useState(false);
  const [answer, setAnswer]             = useState("");
  const [askedQuestion, setAskedQuestion] = useState("");
  const [question, setQuestion]         = useState("");
  const [questionLoading, setQuestionLoading] = useState(false);
  const [error, setError]               = useState("");

  const analysisRef = useRef<HTMLDivElement>(null);
  const questionRef = useRef<HTMLDivElement>(null);

  const facts = computeFacts(provinces, cantons, crimeTotals, trend);

  async function stream(
    body: object,
    setter: React.Dispatch<React.SetStateAction<string>>,
    setLoad: React.Dispatch<React.SetStateAction<boolean>>,
    ref: React.RefObject<HTMLDivElement | null>
  ) {
    setLoad(true);
    setter("");
    setError("");
    try {
      const res = await fetch("/api/analisis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        setError(err.error ?? "Error al conectar con la IA");
        return;
      }
      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setter((prev) => prev + decoder.decode(value, { stream: true }));
        ref.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoad(false);
    }
  }

  function generateAnalysis() {
    stream({}, setAnalysisText, setLoading, analysisRef);
  }

  async function handleQuestion(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    setAskedQuestion(trimmed);
    setQuestionLoading(true);
    try {
      const res = await fetch("/api/analisis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        setError(err.error ?? "Error al conectar con la IA");
        return;
      }
      setAnswer("");
      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setAnswer((prev) => prev + decoder.decode(value, { stream: true }));
        questionRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setQuestionLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">

      {/* Header */}
      <div className="border-b border-slate-800 pb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-600/40 flex items-center justify-center text-violet-400 text-sm">
            ✦
          </span>
          <h1 className="text-2xl font-bold text-white">Análisis Inteligente</h1>
        </div>
        <p className="text-slate-400 text-sm">
          IA entrenada con los datos oficiales del OIJ y el Ministerio de Justicia · {stats.yearRange[0]}–{stats.yearRange[1]}
        </p>
        {!isReal && (
          <div className="mt-3 text-xs text-amber-400 bg-amber-950/30 border border-amber-800/50 rounded-lg px-3 py-2">
            Los datos reales no están cargados aún — el análisis usará datos de ejemplo.
          </div>
        )}
      </div>

      {/* ── Datos Destacados ────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">
          Datos Destacados
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {facts.map((fact) => (
            <div
              key={fact.label}
              className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 flex flex-col gap-1.5"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg leading-none">{fact.icon}</span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">{fact.label}</span>
              </div>
              <p className="text-base font-bold" style={{ color: fact.color }}>
                {fact.value}
              </p>
              {fact.detail && (
                <p className="text-[11px] text-slate-500 leading-snug">{fact.detail}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── AI Analysis ─────────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Análisis Completo con IA</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Claude analiza tendencias, geografía del crimen y hallazgos clave
            </p>
          </div>
          <button
            onClick={generateAnalysis}
            disabled={loading}
            className="shrink-0 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-3 h-3 rounded-full border border-white/30 border-t-white animate-spin" />
                Analizando…
              </>
            ) : (
              <>✦ Generar análisis</>
            )}
          </button>
        </div>

        {error && (
          <div className="text-xs text-red-400 bg-red-950/30 border border-red-800/50 rounded-lg px-3 py-2 mb-3">
            {error}
          </div>
        )}

        {analysisText ? (
          <div
            ref={analysisRef}
            className="text-sm text-slate-300 leading-relaxed space-y-1 rounded-lg bg-slate-950/60 border border-slate-800 p-4"
          >
            {renderMarkdown(analysisText)}
            {loading && (
              <span className="inline-block w-1.5 h-4 bg-violet-400 animate-pulse rounded-sm ml-0.5" />
            )}
          </div>
        ) : !loading ? (
          <div className="text-center py-10 text-slate-600 text-sm">
            Haz clic en <span className="text-violet-400">Generar análisis</span> para obtener un análisis detallado de los datos
          </div>
        ) : (
          <div className="rounded-lg bg-slate-950/60 border border-slate-800 p-4 text-sm text-slate-500">
            <span className="inline-block w-1.5 h-4 bg-violet-400 animate-pulse rounded-sm mr-1" />
            Generando análisis…
          </div>
        )}
      </section>

      {/* ── Custom Q&A ──────────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-white mb-1">Consulta Personalizada</h2>
        <p className="text-xs text-slate-500 mb-4">
          Haz cualquier pregunta sobre los datos criminales de Costa Rica
        </p>

        {/* Suggested questions */}
        <div className="flex flex-wrap gap-2 mb-4">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => { setQuestion(q); handleQuestion(q); }}
              disabled={questionLoading}
              className="text-[11px] text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 rounded-full px-3 py-1 transition-colors disabled:opacity-40"
            >
              {q.length > 60 ? q.slice(0, 58) + "…" : q}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { handleQuestion(question); } }}
            placeholder="Ej: ¿Cuál es la tendencia de homicidios en San José?"
            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-600 transition-colors"
          />
          <button
            onClick={() => handleQuestion(question)}
            disabled={questionLoading || !question.trim()}
            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors"
          >
            {questionLoading ? (
              <span className="w-3 h-3 rounded-full border border-white/30 border-t-white animate-spin block" />
            ) : (
              "Consultar"
            )}
          </button>
        </div>

        {/* Answer */}
        {(answer || (questionLoading && askedQuestion)) && (
          <div className="mt-4 space-y-2" ref={questionRef}>
            <div className="text-xs text-slate-500 font-medium">
              Pregunta: <span className="text-slate-300">{askedQuestion}</span>
            </div>
            <div className="text-sm text-slate-300 leading-relaxed space-y-1 rounded-lg bg-slate-950/60 border border-slate-800 p-4">
              {answer ? (
                <>
                  {renderMarkdown(answer)}
                  {questionLoading && (
                    <span className="inline-block w-1.5 h-4 bg-violet-400 animate-pulse rounded-sm ml-0.5" />
                  )}
                </>
              ) : (
                <span className="text-slate-500">
                  <span className="inline-block w-1.5 h-4 bg-violet-400 animate-pulse rounded-sm mr-1" />
                  Procesando consulta…
                </span>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Footer note */}
      <p className="text-xs text-slate-600 text-center pb-4">
        El análisis se genera con Claude (Anthropic) usando datos del OIJ y el Ministerio de Justicia y Paz.
        Los datos 2018–2022 son tasas /10k hab. y no son directamente comparables con los conteos reales 2023–2025.
      </p>
    </div>
  );
}
