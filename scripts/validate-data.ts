/**
 * Data Watchdog — validates crimes.json and manifest.json integrity.
 *
 * Usage:  npx tsx scripts/validate-data.ts
 *         npm run validate
 *
 * Exit 0 = no critical issues found.
 * Exit 1 = one or more critical issues found (data should not be published).
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// ── Known-good sets ────────────────────────────────────────────────────────────

const KNOWN_PROVINCES = new Set([
  "San José", "Alajuela", "Cartago", "Heredia",
  "Guanacaste", "Puntarenas", "Limón",
]);

// Crime types currently mapped to colors in the UI (categories.ts)
const UI_CRIME_TYPES = new Set([
  "homicidio", "robo", "hurto", "narcotrafico",
  "violacion", "armas", "violencia_domestica", "penalizacion_violencia",
]);

const VALID_UNITS = new Set(["count", "rate_per_10k", undefined]);
const VALID_PERIODS = new Set([
  "Anual",
  "I Semestre", "II Semestre",
  "I Cuatrimestre", "II Cuatrimestre", "III Cuatrimestre",
]);

// ── Helpers ────────────────────────────────────────────────────────────────────

let criticalCount = 0;
let warningCount  = 0;

const criticalMessages: string[] = [];
const warningMessages:  string[] = [];

function critical(msg: string) {
  console.error(`  [CRITICAL] ${msg}`);
  criticalMessages.push(msg);
  criticalCount++;
}

function warn(msg: string) {
  console.warn(`  [WARNING]  ${msg}`);
  warningMessages.push(msg);
  warningCount++;
}

function info(msg: string) {
  console.log(`  [INFO]     ${msg}`);
}

function ok(msg: string) {
  console.log(`  [OK]       ${msg}`);
}

// ── Load files ─────────────────────────────────────────────────────────────────

const ROOT          = path.join(process.cwd(), "public", "data");
const RAW_DIR       = path.join(ROOT, "raw");
const CRIMES_PATH   = path.join(ROOT, "crimes.json");
const MANIFEST_PATH = path.join(ROOT, "manifest.json");

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("  Atlas Criminalidad CR — Data Watchdog");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

// ── 1. File existence ──────────────────────────────────────────────────────────

console.log("§1  File existence");

if (!fs.existsSync(CRIMES_PATH)) {
  critical("crimes.json not found at " + CRIMES_PATH);
  process.exit(1);
} else {
  ok("crimes.json exists");
}
if (!fs.existsSync(MANIFEST_PATH)) {
  warn("manifest.json not found — sourceFiles count will be wrong");
} else {
  ok("manifest.json exists");
}

// ── 2. JSON parse ──────────────────────────────────────────────────────────────

console.log("\n§2  JSON validity");

interface CrimeRecord {
  year: number;
  period: string;
  province: string;
  canton: string | null;
  district: string | null;
  crimeType: string;
  count: number;
  unit?: "count" | "rate_per_10k";
  source: string;
}

interface CrimesJson {
  generatedAt: string;
  sourceFiles: number;
  totalRecords: number;
  provinces: Record<string, Record<string, number>>;
  yearTrend: Record<string, Record<string, number>>;
  records: CrimeRecord[];
}

let data: CrimesJson;
try {
  data = JSON.parse(fs.readFileSync(CRIMES_PATH, "utf-8")) as CrimesJson;
  ok("crimes.json parsed successfully");
} catch (e) {
  critical("crimes.json is not valid JSON: " + String(e));
  process.exit(1);
}

// ── 3. Header vs actual record count ──────────────────────────────────────────

console.log("\n§3  Header consistency");

const records = data.records;

if (!Array.isArray(records)) {
  critical("records field is not an array");
  process.exit(1);
}

if (data.totalRecords !== records.length) {
  critical(
    `Header totalRecords=${data.totalRecords} but actual records.length=${records.length} ` +
    `(delta: ${records.length - data.totalRecords})`
  );
} else {
  ok(`totalRecords header matches actual: ${records.length}`);
}

// Manifest sourceFiles
let manifestCount = 0;
if (fs.existsSync(MANIFEST_PATH)) {
  try {
    const mf = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8")) as { files: unknown[] };
    manifestCount = mf.files?.length ?? 0;
    if (manifestCount !== data.sourceFiles) {
      warn(
        `crimes.json.sourceFiles=${data.sourceFiles} but manifest has ${manifestCount} entries`
      );
    } else {
      ok(`sourceFiles matches manifest: ${manifestCount}`);
    }
  } catch {
    warn("manifest.json could not be parsed");
  }
}

// Data freshness
if (data.generatedAt) {
  const age = Date.now() - new Date(data.generatedAt).getTime();
  const days = Math.floor(age / 86_400_000);
  if (days > 30) {
    warn(`crimes.json is ${days} days old (generatedAt: ${data.generatedAt})`);
  } else {
    ok(`crimes.json freshness: ${days} days old (${data.generatedAt})`);
  }
}

// ── 4. Per-record field validation ─────────────────────────────────────────────

console.log("\n§4  Per-record field validation");

const badProvince:  CrimeRecord[] = [];
const badUnit:      CrimeRecord[] = [];
const badCount:     CrimeRecord[] = [];
const badPeriod:    CrimeRecord[] = [];
const missingType:  CrimeRecord[] = [];
const zeroCount:    CrimeRecord[] = [];

for (const r of records) {
  if (!KNOWN_PROVINCES.has(r.province))         badProvince.push(r);
  if (!VALID_UNITS.has(r.unit as undefined))    badUnit.push(r);
  if (typeof r.count !== "number" || isNaN(r.count) || r.count < 0) badCount.push(r);
  if (r.count === 0)                             zeroCount.push(r);
  if (!r.crimeType || typeof r.crimeType !== "string") missingType.push(r);
  if (r.period && !VALID_PERIODS.has(r.period)) badPeriod.push(r);
}

if (badProvince.length) {
  critical(`${badProvince.length} records have unknown province:`);
  [...new Set(badProvince.map((r) => r.province))].forEach((p) =>
    console.error(`           "${p}"`)
  );
} else {
  ok("All provinces are valid");
}

if (badUnit.length) {
  critical(`${badUnit.length} records have unknown unit value:`);
  [...new Set(badUnit.map((r) => String(r.unit)))].forEach((u) =>
    console.error(`           "${u}"`)
  );
} else {
  ok("All unit values are valid");
}

if (badCount.length) {
  critical(`${badCount.length} records have invalid count (negative, NaN, non-number)`);
  badCount.slice(0, 5).forEach((r) =>
    console.error(`           ${JSON.stringify({ province: r.province, year: r.year, crimeType: r.crimeType, count: r.count })}`)
  );
} else {
  ok("All count values are numeric and non-negative");
}

if (missingType.length) {
  critical(`${missingType.length} records are missing crimeType`);
} else {
  ok("All records have a crimeType");
}

if (zeroCount.length > 0) {
  warn(`${zeroCount.length} records have count=0 (may be placeholder rows)`);
}

if (badPeriod.length > 0) {
  warn(
    `${badPeriod.length} records have unrecognised period values: ` +
    [...new Set(badPeriod.map((r) => r.period))].map((p) => `"${p}"`).join(", ")
  );
} else {
  ok("All period values are recognised");
}

// ── 5. Unit segregation — canton records must not mix units ────────────────────

console.log("\n§5  Unit segregation");

const countRecs = records.filter((r) => r.unit === "count" || r.unit === undefined);
const rateRecs  = records.filter((r) => r.unit === "rate_per_10k");

info(`count records: ${countRecs.length}  |  rate records: ${rateRecs.length}`);

// Check for cantons that appear in BOTH count and rate records
const countCantonKeys = new Set(
  countRecs
    .filter((r) => r.canton)
    .map((r) => `${r.province}||${r.canton}`)
);
const rateCantonKeys = countRecs.length > 0
  ? rateRecs.filter((r) => r.canton && countCantonKeys.has(`${r.province}||${r.canton}`))
  : [];

if (Array.isArray(rateCantonKeys) && rateCantonKeys.length > 0) {
  warn(
    `${rateCantonKeys.length} rate-based canton records share canton keys with count records ` +
    `— getCantonRankings() must not mix them`
  );
} else {
  ok("No canton key appears in both count and rate records");
}

// Count canton records (potential province-level double-counting)
const countCantonRecs = countRecs.filter((r) => r.canton);
if (countCantonRecs.length > 0) {
  const extra = countCantonRecs.reduce((s, r) => s + r.count, 0);
  warn(
    `${countCantonRecs.length} count records have canton set. ` +
    `If province-level records for the same year exist, ` +
    `summing both causes double-counting (extra: ${extra.toLocaleString()} crimes). ` +
    `getCrimeTotals() and getYearTrend() should exclude canton records.`
  );
  // Check if the corresponding province record exists for same year+period+crimeType
  const provCountKeys = new Set(
    countRecs
      .filter((r) => !r.canton)
      .map((r) => `${r.province}||${r.year}||${r.period}||${r.crimeType}`)
  );
  const doubled = countCantonRecs.filter((r) =>
    provCountKeys.has(`${r.province}||${r.year}||${r.period}||${r.crimeType}`)
  );
  if (doubled.length > 0) {
    critical(
      `${doubled.length} canton count records have a matching province-level record ` +
      `for the same year/period/crimeType → confirmed double-counting`
    );
    doubled.forEach((r) =>
      console.error(
        `           ${r.province} / ${r.canton} / ${r.year} ${r.period} / ${r.crimeType} = ${r.count}`
      )
    );
  }
}

// ── 6. Crime type coverage ─────────────────────────────────────────────────────

console.log("\n§6  Crime type coverage");

const dataTypes    = new Set(records.map((r) => r.crimeType));
const countTypes   = new Set(countRecs.map((r) => r.crimeType));
const rateTypes    = new Set(rateRecs.map((r) => r.crimeType));

const inDataNotUI  = [...dataTypes].filter((t) => !UI_CRIME_TYPES.has(t));
const inUINotData  = [...UI_CRIME_TYPES].filter((t) => !dataTypes.has(t));
const inUINotCount = [...UI_CRIME_TYPES].filter((t) => !countTypes.has(t) && dataTypes.has(t));

if (inDataNotUI.length) {
  warn(
    `Crime types in data but not mapped to UI colors (will be invisible in charts): ` +
    inDataNotUI.map((t) => `"${t}"`).join(", ")
  );
} else {
  ok("All data crime types are mapped to UI colors");
}

if (inUINotData.length) {
  warn(
    `Crime types in UI color map but absent from all data (phantom — will show 0): ` +
    inUINotData.map((t) => `"${t}"`).join(", ")
  );
} else {
  ok("All UI crime types have at least one data record");
}

if (inUINotCount.length) {
  info(
    `Crime types with rate data only (no count records — absolute charts will show 0): ` +
    inUINotCount.map((t) => `"${t}"`).join(", ")
  );
}

// ── 7. Count data coverage by year × province ──────────────────────────────────

console.log("\n§7  Count data coverage (province × year)");

const countProvRecs = countRecs.filter((r) => !r.canton && r.period === "Anual");
const countYears = [...new Set(countProvRecs.map((r) => r.year))].sort((a, b) => a - b);

if (countYears.length === 0) {
  warn("No annual province-level count records found");
} else {
  for (const yr of countYears) {
    const provs = new Set(countProvRecs.filter((r) => r.year === yr).map((r) => r.province));
    const types = new Set(countProvRecs.filter((r) => r.year === yr).map((r) => r.crimeType));
    const missing = [...KNOWN_PROVINCES].filter((p) => !provs.has(p));
    const line = `${yr}: ${provs.size}/7 provinces, crime types: [${[...types].join(", ")}]`;
    if (provs.size < 5) {
      warn(`${line} — only ${provs.size} province(s), missing: [${missing.join(", ")}]`);
    } else if (provs.size < 7) {
      info(`${line} — missing: [${missing.join(", ")}]`);
    } else {
      ok(line);
    }

    // Flag suspiciously small count values (may be misclassified rates)
    const annualRecs = countProvRecs.filter((r) => r.year === yr);
    const maxCount = Math.max(...annualRecs.map((r) => r.count));
    if (maxCount < 500 && yr < 2020) {
      warn(
        `Year ${yr}: max province-level annual count is only ${maxCount} ` +
        `— values may be misclassified rate records`
      );
    }
  }
}

// Check for count years outside main range
const suspectYears = countYears.filter((y) => y < 2020);
if (suspectYears.length) {
  warn(
    `Count records exist for years ${suspectYears.join(", ")} — ` +
    `verify these are absolute counts and not rates tagged incorrectly`
  );
}

// ── 8. Duplicate records ───────────────────────────────────────────────────────

console.log("\n§8  Duplicate records");

const dupMap = new Map<string, number>();
for (const r of records) {
  const key = `${r.province}|${r.canton ?? ""}|${r.district ?? ""}|${r.year}|${r.period}|${r.crimeType}|${r.unit ?? "count"}|${r.source}`;
  dupMap.set(key, (dupMap.get(key) ?? 0) + 1);
}
const dups = [...dupMap.entries()].filter(([, n]) => n > 1);
if (dups.length > 0) {
  warn(`${dups.length} duplicate record keys found (same province/canton/year/period/crimeType/source):`);
  dups.slice(0, 5).forEach(([k, n]) => console.warn(`           ×${n}  ${k}`));
} else {
  ok("No duplicate records found");
}

// ── 9. Cross-period double-counting check ──────────────────────────────────────

console.log("\n§9  Cross-period consistency");

// For the same province+year+crimeType, if both Anual AND a semestre record exist,
// the Anual total should not be summed with semestrales (they're subsets).
const annualKeys = new Set(
  countRecs
    .filter((r) => r.period === "Anual" && !r.canton)
    .map((r) => `${r.province}||${r.year}||${r.crimeType}`)
);
const semestreWithAnual = countRecs.filter(
  (r) =>
    !r.canton &&
    r.period !== "Anual" &&
    annualKeys.has(`${r.province}||${r.year}||${r.crimeType}`)
);

if (semestreWithAnual.length > 0) {
  warn(
    `${semestreWithAnual.length} non-Anual count records co-exist with an Anual record ` +
    `for the same province+year+crimeType. Summing both inflates totals.`
  );
  const examples = semestreWithAnual.slice(0, 5);
  examples.forEach((r) =>
    console.warn(
      `           ${r.province} ${r.year} ${r.period} ${r.crimeType} = ${r.count}`
    )
  );
} else {
  ok("No province+year+crimeType has both Anual and semestre count records");
}

// ── 10. Computed stats consistency ─────────────────────────────────────────────

console.log("\n§10 Computed-stats sanity check");

const computedCountTotal = countRecs
  .filter((r) => !r.canton)
  .reduce((s, r) => s + r.count, 0);

const computedAllTotal = countRecs.reduce((s, r) => s + r.count, 0);
const cantonExtra = computedAllTotal - computedCountTotal;

info(`Province-level count total (no canton): ${computedCountTotal.toLocaleString()}`);
if (cantonExtra > 0) {
  info(
    `Canton count records add ${cantonExtra.toLocaleString()} on top ` +
    `(${((cantonExtra / computedAllTotal) * 100).toFixed(2)}% of raw total) — excluded from totals`
  );
}

// ── 11. Rate data coverage ─────────────────────────────────────────────────────

console.log("\n§11 Rate data coverage (province × year)");

const rateProvRecs = rateRecs.filter((r) => !r.canton && r.period === "Anual");
const rateYears = [...new Set(rateProvRecs.map((r) => r.year))].sort((a, b) => a - b);

if (rateYears.length === 0) {
  info("No annual province-level rate records found");
} else {
  for (const yr of rateYears) {
    const provs = new Set(rateProvRecs.filter((r) => r.year === yr).map((r) => r.province));
    const types = new Set(rateProvRecs.filter((r) => r.year === yr).map((r) => r.crimeType));
    const missing = [...KNOWN_PROVINCES].filter((p) => !provs.has(p));
    const line = `${yr}: ${provs.size}/7 provinces, crime types: [${[...types].join(", ")}]`;
    if (provs.size < 5) {
      warn(`${line} — missing: [${missing.join(", ")}]`);
    } else if (provs.size < 7) {
      info(`${line} — partial, missing: [${missing.join(", ")}]`);
    } else {
      ok(line);
    }
  }
}

// ── 12. PDF extraction quality — province coverage per source ──────────────────

console.log("\n§12 PDF extraction quality");

// Group count records by source file
const countBySource = new Map<string, CrimeRecord[]>();
for (const r of countRecs) {
  if (!countBySource.has(r.source)) countBySource.set(r.source, []);
  countBySource.get(r.source)!.push(r);
}

for (const [src, recs] of countBySource) {
  const provs = new Set(recs.filter((r) => !r.canton).map((r) => r.province));
  const totalRecs = recs.length;

  // Flag 1: all records from a multi-province PDF assigned to a single province
  if (provs.size === 1 && totalRecs > 10) {
    critical(
      `Source "${src}": ${totalRecs} count records all assigned to "${[...provs][0]}" only ` +
      `— province detection likely failed during PDF extraction (should cover all 7 provinces)`
    );
  }

  // Flag 2: implausibly small province-level counts (likely misclassified rates)
  const provRecs = recs.filter((r) => !r.canton);
  for (const r of provRecs) {
    if (r.crimeType === "homicidio" && r.count < 30 && r.period === "Anual") {
      critical(
        `Source "${src}": province-level annual homicidio count = ${r.count} for ${r.province} ${r.year} ` +
        `— below plausible minimum (30); likely a rate value misclassified as count`
      );
    }
    if ((r.crimeType === "robo" || r.crimeType === "hurto") && r.count < 100 && r.period === "Anual") {
      critical(
        `Source "${src}": province-level annual ${r.crimeType} count = ${r.count} for ${r.province} ${r.year} ` +
        `— below plausible minimum (100); likely a rate value misclassified as count`
      );
    }
  }

  // Flag 3: multiple province-level records for same province/year/crimeType in same source
  const provLevelKeys = new Map<string, number>();
  for (const r of provRecs) {
    const key = `${r.province}||${r.year}||${r.period}||${r.crimeType}`;
    provLevelKeys.set(key, (provLevelKeys.get(key) ?? 0) + 1);
  }
  const multiProvLevel = [...provLevelKeys.entries()].filter(([, n]) => n > 1);
  if (multiProvLevel.length > 0) {
    critical(
      `Source "${src}": ${multiProvLevel.length} province/year/crimeType combinations have >1 record ` +
      `— canton-level rows are being stored as province-level (canton=null)`
    );
    multiProvLevel.slice(0, 3).forEach(([k, n]) =>
      console.error(`           ×${n}  ${k}`)
    );
  }
}

if (countBySource.size === 0) {
  info("No count records found — site is running on rate data only (2018–2022 Excel)");
}

// ── 13. Source file → crimes.json reconciliation ──────────────────────────────

console.log("\n§13 Source file reconciliation");

if (!fs.existsSync(RAW_DIR)) {
  warn("public/data/raw/ directory not found — cannot verify source-to-database mapping");
} else {
  const rawFiles = fs.readdirSync(RAW_DIR).filter((f) => f.endsWith(".json"));
  const excelFiles = rawFiles.filter((f) => !f.endsWith("_pdf.json") && f !== "manifest.json");
  const pdfFiles   = rawFiles.filter((f) => f.endsWith("_pdf.json"));

  // ── Excel raw files → crimes.json ──────────────────────────────────────────
  info(`Excel raw files: ${excelFiles.length}  |  PDF raw files: ${pdfFiles.length}`);

  for (const f of excelFiles) {
    const inCrimes = records.filter((r) => r.source === f);
    if (inCrimes.length === 0) {
      critical(
        `Excel raw "${f}" has no records in crimes.json — ` +
        `run 'npm run process' or check manifest.json includes this file`
      );
    } else {
      const years  = [...new Set(inCrimes.map((r) => r.year))].sort((a, b) => a - b);
      const provs  = new Set(inCrimes.filter((r) => !r.canton).map((r) => r.province));
      const types  = new Set(inCrimes.map((r) => r.crimeType));
      ok(`Excel raw "${f}": ${inCrimes.length} records · years ${years.join(",")} · ${provs.size}/7 provinces · crime types: [${[...types].join(",")}]`);
    }
  }

  // ── PDF raw files → crimes.json ────────────────────────────────────────────
  for (const f of pdfFiles) {
    const rawPath = path.join(RAW_DIR, f);
    let rawRecords: CrimeRecord[] = [];
    try {
      rawRecords = Object.values(
        JSON.parse(fs.readFileSync(rawPath, "utf-8"))
      ) as CrimeRecord[];
    } catch {
      warn(`Could not parse PDF raw file "${f}"`);
      continue;
    }

    if (rawRecords.length === 0) {
      info(`PDF raw "${f}": empty — no tables extracted from PDF`);
      continue;
    }

    const sourceName = f.replace("_pdf.json", "");
    const inCrimes   = records.filter((r) => r.source === sourceName);
    const rawProvs   = [...new Set(rawRecords.map((r) => r.province))];

    if (inCrimes.length === 0) {
      // Diagnose why it was excluded
      if (rawProvs.length === 1 && rawRecords.length > 10) {
        critical(
          `PDF raw "${f}": ${rawRecords.length} records extracted but EXCLUDED from crimes.json ` +
          `— all assigned to "${rawProvs[0]}" only (province detection failed during PDF extraction). ` +
          `This data is unreliable; fix extract_pdfs.py province detection and re-run.`
        );
      } else if (rawRecords.some((r) => r.crimeType === "homicidio" && r.count < 30 && r.unit === "count")) {
        critical(
          `PDF raw "${f}": excluded — homicidio count values are implausibly small (likely rates ` +
          `misclassified as counts). Fix extract_pdfs.py and re-run.`
        );
      } else {
        warn(`PDF raw "${f}": ${rawRecords.length} records in raw file but 0 in crimes.json`);
      }
    } else {
      const inProvs = new Set(inCrimes.map((r) => r.province));
      const missed  = rawProvs.filter((p) => !inProvs.has(p));
      if (missed.length > 0) {
        warn(`PDF raw "${f}": provinces ${missed.join(", ")} present in raw file but missing in crimes.json`);
      } else {
        ok(`PDF raw "${f}": ${inCrimes.length}/${rawRecords.length} records loaded · ${inProvs.size} province(s)`);
      }
    }
  }

  // ── Orphan sources in crimes.json (no matching raw file) ───────────────────
  const knownSources = new Set([
    ...excelFiles,
    ...pdfFiles.map((f) => f.replace("_pdf.json", "")),
  ]);
  const orphans = [...new Set(records.map((r) => r.source))].filter(
    (s) => !knownSources.has(s) && !knownSources.has(s + ".json")
  );
  if (orphans.length > 0) {
    warn(
      `${orphans.length} source(s) appear in crimes.json but have no corresponding raw file ` +
      `(data cannot be traced back to source): ${orphans.join(", ")}`
    );
  } else {
    ok("All crime records in crimes.json are traceable to a raw source file");
  }
}

// ── 14. Website display verification (crimes.json → UI) ───────────────────────

console.log("\n§14 Website display verification");

// Find the best rate year (same algorithm as data.ts getRateSummaryYear)
const annualProvRates = rateRecs.filter(
  (r) => !r.canton && r.period === "Anual" && KNOWN_PROVINCES.has(r.province)
);
const ypMap = new Map<number, Set<string>>();
for (const r of annualProvRates) {
  if (!ypMap.has(r.year)) ypMap.set(r.year, new Set());
  ypMap.get(r.year)!.add(r.province);
}
const bestRateYear = ypMap.size > 0
  ? [...ypMap.entries()].sort((a, b) => b[1].size - a[1].size || b[0] - a[0])[0][0]
  : null;

// ── Province table (getProvinceAggregateCrimes) ─────────────────────────────
if (!bestRateYear) {
  critical("Website province table: no annual province-level rate data — table will be empty");
} else {
  const displayedRates = annualProvRates.filter((r) => r.year === bestRateYear);
  const displayedProvs = new Set(displayedRates.map((r) => r.province));
  const missingProvs   = [...KNOWN_PROVINCES].filter((p) => !displayedProvs.has(p));

  if (missingProvs.length > 0) {
    warn(
      `Website province table (year=${bestRateYear}): ` +
      `${missingProvs.join(", ")} will show all-zero — no rate records for those provinces`
    );
  } else {
    ok(`Website province table: all 7 provinces have data for year ${bestRateYear}`);
  }

  // Verify each displayed value is traceable to an exact record in crimes.json
  let traceFailures = 0;
  for (const r of displayedRates) {
    const match = records.find(
      (x) =>
        x.province === r.province &&
        x.crimeType === r.crimeType &&
        x.year === r.year &&
        x.period === r.period &&
        x.count === r.count &&
        !x.canton
    );
    if (!match) {
      traceFailures++;
      critical(
        `Website value NOT traceable: ${r.province} / ${r.crimeType} / ${r.year} = ${r.count} — ` +
        `record exists in filter but not in full records array (data corruption)`
      );
    }
  }
  if (traceFailures === 0) {
    ok(`All ${displayedRates.length} province table values are traceable to exact records in crimes.json`);
  }
}

// ── KPI cards (getCrimeTotals) ───────────────────────────────────────────────
const countRecsForKPI = records.filter((r) => (r.unit === "count" || r.unit === undefined) && !r.canton);
if (countRecsForKPI.length > 0) {
  ok(`KPI cards: using absolute counts (${countRecsForKPI.length} province-level count records)`);
} else if (bestRateYear) {
  const kpiSource = annualProvRates.filter((r) => r.year === bestRateYear);
  for (const ct of [...UI_CRIME_TYPES]) {
    const vals = kpiSource.filter((r) => r.crimeType === ct).map((r) => r.count);
    if (vals.length === 0) {
      warn(`KPI card "${ct}": no data for year ${bestRateYear} — will show 0`);
    }
  }
  ok(`KPI cards: falling back to rate /10k from ${bestRateYear} — all traceable to crimes.json`);
} else {
  critical("KPI cards: no data source available — all cards will show 0");
}

// ── Year trend chart (getYearTrend) ─────────────────────────────────────────
const trendYears = [...new Set(records.filter((r) => !r.canton).map((r) => r.year))].sort(
  (a, b) => a - b
);
if (trendYears.length === 0) {
  critical("Website year trend chart: no data — chart will be empty");
} else {
  // Check for gaps > 1 year
  const gaps: string[] = [];
  for (let i = 1; i < trendYears.length; i++) {
    if (trendYears[i] - trendYears[i - 1] > 1) {
      gaps.push(`${trendYears[i - 1]}→${trendYears[i]}`);
    }
  }
  if (gaps.length > 0) warn(`Year trend chart has gaps: ${gaps.join(", ")}`);
  else ok(`Year trend chart: continuous data ${trendYears[0]}–${trendYears[trendYears.length - 1]}`);
}

// ── Canton rankings (getCantonRankings) ─────────────────────────────────────
const cantonRateRecs = rateRecs.filter(
  (r) => r.canton && KNOWN_PROVINCES.has(r.province)
);
if (cantonRateRecs.length === 0) {
  critical("Website canton rankings: no canton-level rate data — rankings will be empty");
} else {
  const uniqueCantons = new Set(
    cantonRateRecs.map((r) => `${r.province}||${r.canton}`)
  );
  const cantonProvCoverage = new Set(cantonRateRecs.map((r) => r.province));
  const missingCantonProvs = [...KNOWN_PROVINCES].filter((p) => !cantonProvCoverage.has(p));
  if (missingCantonProvs.length > 0) {
    warn(`Canton rankings: no canton data for provinces: ${missingCantonProvs.join(", ")}`);
  }
  ok(`Canton rankings: ${uniqueCantons.size} distinct cantons across ${cantonProvCoverage.size}/7 provinces`);
}

// ── Impossible / inaccurate values ──────────────────────────────────────────
let impossibleRates = 0;
for (const r of rateRecs) {
  if (r.count > 10_000) {
    impossibleRates++;
    critical(
      `Impossible rate: ${r.province}/${r.canton ?? "—"}/${r.crimeType}/${r.year} = ${r.count}/10k ` +
      `(>100% of population — likely raw count stored as rate)`
    );
  }
}
if (impossibleRates === 0) ok("No impossible rate values (all ≤ 10,000 /10k)");

// ── Year-over-year spikes (province level) ──────────────────────────────────
const provCrimYearMap = new Map<string, { year: number; count: number }[]>();
for (const r of annualProvRates) {
  const key = `${r.province}||${r.crimeType}`;
  if (!provCrimYearMap.has(key)) provCrimYearMap.set(key, []);
  provCrimYearMap.get(key)!.push({ year: r.year, count: r.count });
}
let spikeCount = 0;
for (const [key, entries] of provCrimYearMap) {
  entries.sort((a, b) => a.year - b.year);
  for (let i = 1; i < entries.length; i++) {
    const prev = entries[i - 1].count;
    const curr = entries[i].count;
    if (prev > 0 && curr / prev > 10) {
      spikeCount++;
      warn(`Suspicious 10× spike in ${key}: ${prev} (${entries[i-1].year}) → ${curr} (${entries[i].year})`);
    }
  }
}
if (spikeCount === 0) ok("No suspicious year-over-year spikes detected (>10×)");

// ── Summary ────────────────────────────────────────────────────────────────────

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(`  Result: ${criticalCount} critical issue(s), ${warningCount} warning(s)`);
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

// ── 15. Human escalation — GitHub issue ───────────────────────────────────────

if (criticalCount > 0) {
  console.error("  FAIL — fix critical issues before publishing data.\n");

  const reportDate = new Date().toISOString();
  const issueTitle = `🚨 Data Watchdog: ${criticalCount} critical issue(s) — ${reportDate.split("T")[0]}`;

  const issueBody = `## Atlas Criminalidad CR — Data Watchdog Alert

**Date:** ${reportDate}
**Result:** ${criticalCount} critical issue(s), ${warningCount} warning(s)

---

## Critical Issues

${criticalMessages.map((m, i) => `${i + 1}. ${m}`).join("\n")}

---

## Warnings

${warningMessages.length > 0 ? warningMessages.map((m, i) => `${i + 1}. ${m}`).join("\n") : "_None_"}

---

## What to check

1. Run \`npm run validate\` locally to reproduce this report
2. Inspect \`public/data/crimes.json\` for the flagged records
3. Inspect \`public/data/raw/\` for source files mentioned in §13
4. If PDF province detection failed: fix \`scripts/extract_pdfs.py\` and re-run \`python scripts/extract_pdfs.py\`
5. If Excel extraction dropped records: fix \`scripts/process.ts\` and re-run \`npm run process\`
6. After fixing, re-run \`npm run validate\` to confirm all critical issues are resolved

## Checklist

- [ ] All critical issues reviewed
- [ ] Root cause identified for each
- [ ] Fix implemented and tested
- [ ] \`npm run validate\` passes with 0 critical issues
- [ ] Fixed \`public/data/crimes.json\` committed and deployed

> Auto-generated by \`npm run validate\` (scripts/validate-data.ts)
`;

  // Write body to temp file to avoid shell quoting issues
  const reportFile = path.join(process.cwd(), ".watchdog-report.md");
  fs.writeFileSync(reportFile, issueBody, "utf-8");

  let issueCreated = false;
  try {
    const out = execSync(
      `gh issue create --title "${issueTitle.replace(/"/g, '\\"')}" --body-file "${reportFile}"`,
      { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    ).trim();
    console.error(`  Escalation: GitHub issue created → ${out}\n`);
    issueCreated = true;
  } catch {
    console.error("  Escalation: gh CLI unavailable or not authenticated.");
    console.error("  ── Full report saved to .watchdog-report.md ──");
    console.error("  Manually open a GitHub issue with the contents of that file.\n");
  } finally {
    if (issueCreated && fs.existsSync(reportFile)) {
      try { fs.unlinkSync(reportFile); } catch { /* ignore */ }
    }
  }

  process.exit(1);
} else if (warningCount > 0) {
  console.log("  PASS with warnings — review warnings above.\n");
  process.exit(0);
} else {
  console.log("  PASS — all checks passed.\n");
  process.exit(0);
}
