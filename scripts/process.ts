#!/usr/bin/env tsx
/**
 * Reads raw JSON files produced by scrape.ts and normalises them into
 * a single crimes.json consumed by the Next.js frontend.
 *
 * Data structure of OIJ/MSP Excel files:
 *   Row 0-1: Title + "Tasa por 10 mil habitantes"
 *   Row 2:   Header — col 0 = "Cantón", col 1 = "Distrito", col 2+ = crime types
 *   Row 3:   Province header — ["San José", null, null, ...]
 *   Row 4:   First district of first canton — ["San José", "Carmen", rate1, ...]
 *   Row 5+:  More districts — [null, "Merced", rate1, ...]  (col 0 = null)
 *
 * Province name == Canton name == first District name (capital district).
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
  lesiones: "agresion",
  "lesiones dolosas": "agresion",
  "viol.": "violacion",
  violacion: "violacion",
  violación: "violacion",
  violaciones: "violacion",
  "violacion, estupro": "violacion",  // OIJ exact header phrase
  narcotráfico: "narcotrafico",
  narcotrafico: "narcotrafico",
  droga: "narcotrafico",
  drogas: "narcotrafico",
  psicotr: "narcotrafico",
  "psicotrópico": "narcotrafico",
  "violencia dom": "violencia_domestica",
  "armas y exp": "armas",
  "penaliz": "penalizacion_violencia",
  extorsion: "extorsion",
  extorsión: "extorsion",
};

export interface CrimeRecord {
  year: number;
  period: string;
  province: string;
  canton: string | null;
  district: string | null;
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
    if (n.includes(normalise(alias))) return canonical;
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

  // ── Step 1: Find header row (most crime-type column matches) ──────────────
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

  // ── Step 2: Detect column structure ───────────────────────────────────────
  //  OIJ/MSP files use 2 name columns: col 0 = Canton, col 1 = Distrito
  //  Detect by looking for a "Distrito" header cell in the header row.
  const headerRow = rows[headerRowIdx];
  let districtCol = -1;
  for (let j = 0; j < headerRow.length; j++) {
    const h = typeof headerRow[j] === "string" ? normalise(headerRow[j] as string) : "";
    if (h.includes("distrit") || h === "distrito") {
      districtCol = j;
      break;
    }
  }

  // For the single-name-column case, find the first text column in data rows
  let nameCol = 0;
  if (districtCol < 0) {
    const firstRow = rows[headerRowIdx + 1] ?? [];
    for (let j = 0; j < firstRow.length; j++) {
      if (typeof firstRow[j] === "string" && (firstRow[j] as string).length > 2) {
        nameCol = j;
        break;
      }
    }
  }
  // When using canton+district structure, nameCol = 0 (canton column)

  // ── Step 3: Iterate data rows ─────────────────────────────────────────────
  let currentProvince = "Desconocida";
  let currentCanton: string | null = null;

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i];

    let cantonLabel: string | null = null;
    let districtLabel: string | null = null;

    if (districtCol >= 0) {
      // ── Canton+District 2-column structure ──────────────────────────────
      const col0 = row[0];
      const col1 = row[districtCol];

      if (col0 != null && String(col0).trim().length > 0) {
        // col 0 has a value: could be province OR canton
        const prov = detectProvince(col0);

        if (prov && (col1 == null || String(col1).trim().length === 0)) {
          // Province header row (col 1 is empty)
          currentProvince = prov;
          currentCanton = null;
          continue;
        }

        // This is a canton row (col 0 = canton, col 1 = first district)
        // NOTE: province name == canton name (e.g. "San José" canton) is handled here
        if (prov) currentProvince = prov;
        currentCanton = String(col0).trim();
        cantonLabel = currentCanton;
        districtLabel = col1 != null && String(col1).trim().length > 0
          ? String(col1).trim() : null;

      } else if (col0 == null || String(col0).trim().length === 0) {
        // col 0 is empty — this is a subsequent district row
        if (!currentCanton) continue;
        if (col1 == null || String(col1).trim().length === 0) continue;
        cantonLabel = currentCanton;
        districtLabel = String(col1).trim();
      }

    } else {
      // ── Single-name-column structure (fallback) ─────────────────────────
      const nameCell = row[nameCol];
      if (!nameCell) continue;

      const prov = detectProvince(nameCell);
      if (prov) { currentProvince = prov; continue; }

      cantonLabel = typeof nameCell === "string" ? nameCell.trim() : null;
      if (!cantonLabel) continue;
    }

    if (!cantonLabel) continue;

    // Emit a record for each crime type column
    for (const [colStr, crimeType] of Object.entries(crimeColMap)) {
      const col = parseInt(colStr);
      const val = row[col];
      if (!isNumericCell(val)) continue;
      const count = toNumber(val);
      if (count <= 0) continue;

      // Province header rows (col0=province, col1=empty) are already caught above
      // and skipped with `continue`, so any row reaching here is a canton/district
      // row. cantonLabel is always a canton name — never a province-level record.
      records.push({
        year,
        period,
        province: currentProvince,
        canton:   cantonLabel,
        district: districtLabel,
        crimeType,
        count,
        unit: "rate_per_10k",  // All OIJ/MSP Excel files are rates per 10,000 inhabitants
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
    // Skip PDF-extracted files (they have their own pipeline in extract_pdfs.py)
    if (entry.filename.endsWith("_pdf.json")) continue;

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

  // Deduplicate province-level Excel records (canton === null): multiple sheets
  // in the same file (or different files for the same year) can report the same
  // annual province total. Keep the maximum value per (province, year, period, crimeType).
  const provinceDedupeMap = new Map<string, CrimeRecord>();
  const cantonRecords: CrimeRecord[] = [];
  for (const r of allRecords) {
    if (r.canton !== null) {
      cantonRecords.push(r);
    } else {
      const key = `${r.province}||${r.year}||${r.period}||${r.crimeType}`;
      const ex = provinceDedupeMap.get(key);
      if (!ex || r.count > ex.count) provinceDedupeMap.set(key, r);
    }
  }
  const deduplicatedExcel = [...cantonRecords, ...provinceDedupeMap.values()];
  console.log(`\n  Dedup: ${allRecords.length} → ${deduplicatedExcel.length} Excel records`);

  // ── Also merge in existing PDF records from crimes.json ───────────────────
  const existingPath = OUT_FILE;
  let pdfRecords: CrimeRecord[] = [];
  if (fs.existsSync(existingPath)) {
    const existing = JSON.parse(fs.readFileSync(existingPath, "utf-8"));
    pdfRecords = (existing.records ?? []).filter(
      (r: CrimeRecord) => r.unit === "count"
    );
    console.log(`  📄 Keeping ${pdfRecords.length} existing PDF count records`);
  }

  const finalRecords: CrimeRecord[] = [...deduplicatedExcel, ...pdfRecords];

  // ── Build summary structures for the frontend ─────────────────────────────

  // Province summaries — only from province-level records (canton = null)
  const byProvince: Record<string, Record<string, number>> = {};
  const byYearCrime: Record<string, Record<string, number>> = {};

  for (const r of finalRecords) {
    // Year trend: include all records (rates for historical, counts for recent)
    const key = String(r.year);
    if (!byYearCrime[key]) byYearCrime[key] = {};
    byYearCrime[key][r.crimeType] = (byYearCrime[key][r.crimeType] ?? 0) + r.count;
  }

  // Province totals from count records only (PDF data, province-level)
  for (const r of pdfRecords.filter(r => !r.canton)) {
    if (!byProvince[r.province]) byProvince[r.province] = {};
    byProvince[r.province][r.crimeType] =
      (byProvince[r.province][r.crimeType] ?? 0) + r.count;
  }

  const output = {
    generatedAt: new Date().toISOString(),
    sourceFiles: fileCount,
    totalRecords: finalRecords.length,
    provinces: byProvince,
    yearTrend: byYearCrime,
    records: finalRecords,
  };

  fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2));

  const districtCount = new Set(
    deduplicatedExcel.filter(r => r.district).map(r => `${r.province}/${r.canton}/${r.district}`)
  ).size;
  const cantonCount = new Set(
    deduplicatedExcel.filter(r => r.canton).map(r => `${r.province}/${r.canton}`)
  ).size;

  console.log(`\n✅ crimes.json written — ${finalRecords.length} total records`);
  console.log(`   Excel records (rates):  ${deduplicatedExcel.length} from ${fileCount} file(s)`);
  console.log(`   PDF records (counts):   ${pdfRecords.length}`);
  console.log(`   Districts covered:      ${districtCount}`);
  console.log(`   Cantons covered:        ${cantonCount}`);
}

main();
