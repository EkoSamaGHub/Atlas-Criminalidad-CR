import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getStats, getYearTrend, getProvinces, getCantonRankings, getCrimeTotals } from "@/lib/data";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY no configurado en .env.local" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const body = await req.json().catch(() => ({})) as { question?: string };
  const { question } = body;

  const stats = getStats();
  const trend = getYearTrend();
  const { provinces } = getProvinces();
  const cantons = getCantonRankings().slice(0, 15);
  const crimeTotals = getCrimeTotals();

  const countTrend = trend.filter((p) => p.unit === "count");

  const dataSummary = `
CRIMINALIDAD COSTA RICA — DATOS OIJ / MINISTERIO DE JUSTICIA (2018–2025)

RESUMEN GENERAL:
- Registros: ${stats.totalRecords.toLocaleString("es-CR")}
- Período cubierto: ${stats.yearRange[0]}–${stats.yearRange[1]}
- Cantones con datos: ${stats.cantonCount}
- Fuentes: ${stats.sourceFiles} publicaciones oficiales
- Nota: datos 2018-2022 = tasas /10,000 hab. (Anexos Excel OIJ); datos 2023-2025 = conteos absolutos (Atlas PDF)

TOTALES POR TIPO DE DELITO (conteos reales 2023-2025):
${Object.entries(crimeTotals)
  .sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `  ${k}: ${v.toLocaleString("es-CR")}`)
  .join("\n")}

TENDENCIA ANUAL (conteos reales, 2023-2025):
${countTrend
  .map(
    (p) =>
      `  ${p.year}: homicidio=${p.homicidio.toLocaleString("es-CR")}, robo=${p.robo.toLocaleString("es-CR")}, hurto=${p.hurto.toLocaleString("es-CR")}, narcotrafico=${p.narcotrafico.toLocaleString("es-CR")}, violacion=${p.violacion.toLocaleString("es-CR")}, total=${p.total.toLocaleString("es-CR")}`
  )
  .join("\n")}

DATOS PROVINCIALES (año más reciente disponible):
${provinces
  .map(
    (p) =>
      `  ${p.name} (pob. ${p.population.toLocaleString("es-CR")}): ` +
      `homicidio=${p.crimes.homicidio}, robo=${p.crimes.robo}, hurto=${p.crimes.hurto}, ` +
      `narcotrafico=${p.crimes.narcotrafico}, violacion=${p.crimes.violacion}, ` +
      `tasa/100k=${p.rate}, var.interanual=${p.trend > 0 ? "+" : ""}${p.trend}%`
  )
  .join("\n")}

TOP 15 CANTONES POR TOTAL DE DELITOS:
${cantons
  .map(
    (c, i) =>
      `  ${i + 1}. ${c.canton} (${c.province}): ${c.total.toLocaleString("es-CR")} delitos`
  )
  .join("\n")}
`.trim();

  const systemPrompt = `Eres un analista experto en seguridad ciudadana y criminología en Costa Rica. \
Analizas datos oficiales del OIJ (Organismo de Investigación Judicial) y el Observatorio de Violencia del Ministerio de Justicia y Paz.

Tu análisis debe ser:
- Completamente en español
- Estrictamente basado en los datos proporcionados, sin inventar cifras
- Claro, objetivo y accesible para ciudadanos y periodistas
- Sin sensacionalismo; usar lenguaje sobrio y riguroso
- Mencionar brevemente las limitaciones de los datos cuando sea relevante (cambio de metodología 2022/2023)
- Formatear la respuesta con secciones claras usando **negritas** para los encabezados`;

  const userMessage = question
    ? `Con base en los siguientes datos criminales de Costa Rica, responde esta pregunta de forma clara y concisa:\n\n"${question}"\n\n${dataSummary}`
    : `Con base en los datos criminales de Costa Rica (2018-2025), genera un análisis completo que incluya:\n\n1. **Panorama general** de la seguridad ciudadana\n2. **Tendencias más importantes** (aumento o disminución de delitos)\n3. **Geografía del crimen** (provincias y cantones más afectados)\n4. **Tipos de delito** más frecuentes y sus patrones\n5. **Datos destacables** — hallazgos sorprendentes o poco conocidos\n6. **Conclusiones clave** para entender la situación actual\n\n${dataSummary}`;

  const client = new Anthropic({ apiKey });

  const stream = client.messages.stream({
    model: process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001",
    max_tokens: 1800,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
