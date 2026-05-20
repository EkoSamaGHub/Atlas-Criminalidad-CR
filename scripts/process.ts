#!/usr/bin/env tsx
/**
 * Reads raw JSON files produced by scrape.ts and normalises them into
 * a single crimes.json consumed by the Next.js frontend.
 *
 * Heuristic approach because each Excel edition has a different layout:
 *   1. Detect rows that look like province/canton headers.
 *   2. Detect columns that look like crime-type counts.
 *   3. Emit normalised CrimeRecord rows.
 *
 * Usage: npm run process
 */
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "public", "data");
const RAW_DIR = path.join(DATA_DIR, "raw");
const OUT_FILE = path.join(DATA_DIR, "crimes.json");

// ── Costa Rica province/canton dictionaries ──────────────────────────────────

const PROVINCES = [
  "San José", "Alajuela", "Cartago", "Heredia",
  "Guanacaste", "Puntarenas", "Limón",
];

const PROVINCE_ALIASES: Record<string, string> = {
  "san jose": "San José",
  "sanjose": "San José",
  "alajuela": "Alajuela",
  "cartago": "Cartago",
  "heredia": "Heredia",
  "guanacaste": "Guanacaste",
  "puntarenas": "Puntarenas",
  "limon": "Limón",
  "limón": "Limón",
};

const CRIME_ALIASES: Record<string, string> = {
  homicidio: "homicidio",
  "homicidios dolosos": "homicidio",
  "hom.": "homicidio",
  robo: "robo",
  robos: "robo",
  asalto: "robo",            // OIJ "Asalto" = armed robbery
  "robo de veh": "robo",     // Robo de Vehículo
  hurto: "hurto",
  hurtos: "hurto",
  "tacha de veh": "hurto",   // Tacha de Vehículo (vehicle theft)
  agresion: "agresion",
  agresión: "agresion",
  agresiones: "agresion",
  lesiones: "agresion",       // Lesiones (injuries = assaults)
  "lesiones dolosas": "agresion",
  "viol.": "violacion",
  violacion: "violacion",
  violación: "violacion",
  violaciones: "violacion",
  narcotráfico: "narcotrafico",
  narcotrafico: "narcotrafico",
  droga: "narcotrafico",
  drogas: "narcotrafico",
  psicotr: "narcotrafico",    // Psicotrópicos (MSP drug offenses)
  "psicotrópico": "narcotrafico",
  "violencia dom": "violencia_domestica",
  "armas y exp": "armas",    // Armas y Explosivos
  "penaliz": "penalizacion_violencia",
  extorsion: "extorsion",
  extorsión: "extorsion",
};

export interface CrimeRecord {
  year: number;
  period: string;
  province: string;
  canton: string | null;
  crimeType: string;
  count: number;
  unit: "count" | "rate_per_10k";
  source: string;
}

function normalise(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

function detectProvince(cell: unknown): string | null {
  if (typeof cell !== "string") return null;
  const n = normalise(cell);
  return PROVINCE_ALIASES[n] ?? null;
}

function detectCrimeType(header: unknown): string | null {
  if (typeof header !== "string") return null;
  const n = normalise(header);
  for (const [alias, canonical] of Object.entries(CRIME_ALIASES)) {
    if (n.includes(alias)) return canonical;
  }
  return null;
}

function isNumericCell(v: unknown): boolean {
  if (typeof v === "number") return true;
  if (typeof v === "string") return /^\d[\d,. ]*$/.test(v.trim());
  return false;
}

function toNumber(v: unknown): number {
  if (typeof v === "number") return Math.round(v);
  if (typeof v === "string") return parseInt(v.replace(/[^\d]/g, "")) || 0;
  return 0;
}

function processSheet(
  rows: unknown[][],
  source: string,
  year: number,
  period: string
): CrimeRecord[] {
  const records: CrimeRecord[] = [];
  if (!rows || rows.length < 2) return records;

  // Find header row — the row that has the most crime-type matches
  let headerRowIdx = -1;
  let crimeColMap: Record<number, string> = {};
  let bestScore = 0;

  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const row = rows[i];
    const colMap: Record<number, string> = {};
    let score = 0;
    row.forEach((cell, j) => {
      const ct = detectCrimeType(cell);
      if (ct) { colMap[j] = ct; score++; }
    });
    if (score > bestScore) {
      bestScore = score;
      headerRowIdx = i;
      crimeColMap = colMap;
    }
  }

  if (headerRowIdx === -1 || Object.keys(crimeColMap).length === 0) return records;

  // Find the column that holds province/canton names (first text column)
  const firstRow = rows[headerRowIdx + 1] ?? [];
  let nameCol = 0;
  for (let j = 0; j < firstRow.length; j++) {
    if (typeof firstRow[j] === "string" && (firstRow[j] as string).length > 2) {
      nameCol = j;
      break;
    }
  }

  let currentProvince = "Desconocida";

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const nameCell = row[nameCol];
    if (!nameCell) continue;

    const province = detectProvince(nameCell);
    if (province) {
      currentProvince = province;
      continue;
    }

    const label = typeof nameCell === "string" ? nameCell.trim() : null;
    if (!label) continue;

    for (const [colStr, crimeType] of Object.entries(crimeColMap)) {
      const col = parseInt(colStr);
      const val = row[col];
      if (!isNumericCell(val)) continue;
      const count = toNumber(val);
      if (count <= 0) continue;

      const isProvince = PROVINCES.includes(label);
      records.push({
        year,
        period,
        province: isProvince ? label : currentProvince,
        canton: isProvince ? null : label,
        crimeType,
        count,
        unit: "rate_per_10k",  // All OIJ Excel files are rates per 10,000 inhabitants
        source,
      });
    }
  }

  return records;
}

interface ManifestEntry {
  filename: string;
  year: number | null;
  title: string;
  sheets: string[];
}

interface Manifest {
  updatedAt: string;
  files: ManifestEntry[];
}

function guessPeriod(filename: string, sheetName: string): string {
  const text = `${filename} ${sheetName}`.toLowerCase();
  if (text.includes("i sem") || text.includes("primer sem")) return "I Semestre";
  if (text.includes("ii sem") || text.includes("segundo sem")) return "II Semestre";
  if (text.includes("i cuatrim")) return "I Cuatrimestre";
  if (text.includes("ii cuatrim")) return "II Cuatrimestre";
  if (text.includes("iii cuatrim")) return "III Cuatrimestre";
  return "Anual";
}

function main() {
  const manifestPath = path.join(DATA_DIR, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    console.error("❌ manifest.json not found. Run `npm run scrape` first.");
    process.exit(1);
  }

  const manifest: Manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  console.log(`\n🔄 Processing ${manifest.files.length} file(s)…\n`);

  const allRecords: CrimeRecord[] = [];
  let fileCount = 0;

  for (const entry of manifest.files) {
    const rawPath = path.join(RAW_DIR, entry.filename);
    if (!fs.existsSync(rawPath)) {
      console.warn(`  ⚠ Missing: ${entry.filename}`);
      continue;
    }

    const sheetMap: Record<string, unknown[][]> = JSON.parse(
      fs.readFileSync(rawPath, "utf-8")
    );

    const year = entry.year ?? new Date().getFullYear();
    let recordCount = 0;

    for (const [sheetName, rows] of Object.entries(sheetMap)) {
      const period = guessPeriod(entry.filename, sheetName);
      const records = processSheet(rows, entry.filename, year, period);
      allRecords.push(...records);
      recordCount += records.length;
    }

    console.log(`  ${recordCount > 0 ? "✓" : "○"} ${entry.filename} — ${recordCount} record(s)`);
    if (recordCount > 0) fileCount++;
  }

  // ── Build summary structures for the frontend ─────────────────────────────

  // Province summaries (latest year available per province)
  const byProvince: Record<string, Record<string, number>> = {};
  for (const r of allRecords) {
    if (!byProvince[r.province]) byProvince[r.province] = {};
    byProvince[r.province][r.crimeType] =
      (byProvince[r.province][r.crimeType] ?? 0) + r.count;
  }

  // Year × crime-type totals for trend chart
  const byYearCrime: Record<string, Record<string, number>> = {};
  for (const r of allRecords) {
    const key = String(r.year);
    if (!byYearCrime[key]) byYearCrime[key] = {};
    byYearCrime[key][r.crimeType] =
      (byYearCrime[key][r.crimeType] ?? 0) + r.count;
  }

  const output = {
    generatedAt: new Date().toISOString(),
    sourceFiles: fileCount,
    totalRecords: allRecords.length,
    provinces: byProvince,
    yearTrend: byYearCrime,
    records: allRecords,
  };

  fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2));

  console.log(`\n✅ crimes.json written — ${allRecords.length} records from ${fileCount} file(s)`);
  if (allRecords.length === 0) {
    console.log("   ℹ  No records extracted yet — the normaliser may need tuning once you inspect the raw JSON files.");
  }
}

main();
