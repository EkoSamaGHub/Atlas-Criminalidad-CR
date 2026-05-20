/**
 * Central data layer — reads crimes.json + manifest.json at server render time.
 * Falls back to mock data when no real data exists yet.
 *
 * Data unit notes:
 *  - Excel records (2018-2022): unit = "rate_per_10k"  (tasas por 10 mil habitantes)
 *  - PDF records  (2023-2025):  unit = "count"          (absolute crime counts)
 */
import fs from "fs";
import path from "path";
import { PROVINCES as MOCK_PROVINCES, CATEGORIES, type ProvinceData, type CrimeCategory } from "./mockData";

export { CATEGORIES };
export type { ProvinceData, CrimeCategory };

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CrimeRecord {
  year: number;
  period: string;
  province: string;
  canton: string | null;
  district: string | null;           // district-level data from Excel files
  crimeType: string;
  count: number;
  unit?: "count" | "rate_per_10k";  // undefined = legacy (treat as count)
  source: string;
}

export interface CantonData {
  canton: string;
  province: string;
  crimes: Record<string, number>;
  total: number;
}

export interface YearTrendPoint {
  year: number;
  homicidio: number;
  robo: number;
  hurto: number;
  narcotrafico: number;
  violacion: number;
  agresion: number;
  total: number;
  unit: "count" | "rate_per_10k" | "mixed";
}

export interface ManifestEntry {
  title: string;
  originalUrl: string;
  filename: string;
  year: number | null;
  sheets: string[];
  downloadedAt: string;
}

export interface DataStats {
  totalRecords: number;
  totalCount: number;       // sum of count-based records
  totalRateRecords: number; // number of rate records
  yearRange: [number, number];
  countYearRange: [number, number] | null;  // years with actual counts
  years: number[];
  crimeTypes: string[];
  provinces: string[];
  cantonCount: number;
  districtCount: number;
  sourceFiles: number;
  generatedAt: string | null;
  isReal: boolean;
}

interface CrimesJson {
  generatedAt: string;
  sourceFiles: number;
  totalRecords: number;
  provinces: Record<string, Record<string, number>>;
  yearTrend: Record<string, Record<string, number>>;
  records: CrimeRecord[];
}

// ── Loader ────────────────────────────────────────────────────────────────────

let _cache: CrimesJson | null | undefined = undefined;

function loadCrimesJson(): CrimesJson | null {
  if (_cache !== undefined) return _cache;
  try {
    const p = path.join(process.cwd(), "public", "data", "crimes.json");
    if (!fs.existsSync(p)) { _cache = null; return null; }
    _cache = JSON.parse(fs.readFileSync(p, "utf-8")) as CrimesJson;
    return _cache;
  } catch { _cache = null; return null; }
}

function loadManifest(): ManifestEntry[] {
  try {
    const p = path.join(process.cwd(), "public", "data", "manifest.json");
    if (!fs.existsSync(p)) return [];
    return (JSON.parse(fs.readFileSync(p, "utf-8")) as { files: ManifestEntry[] }).files ?? [];
  } catch { return []; }
}

// ── Province meta ─────────────────────────────────────────────────────────────

export const PROVINCE_META: Record<string, { code: string; population: number }> = {
  "San José":   { code: "SJ", population: 1404242 },
  Alajuela:     { code: "AL", population: 1002614 },
  Cartago:      { code: "CA", population: 539925 },
  Heredia:      { code: "HE", population: 476011 },
  Guanacaste:   { code: "GU", population: 354083 },
  Puntarenas:   { code: "PU", population: 476021 },
  Limón:        { code: "LI", population: 428391 },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function isCount(r: CrimeRecord): boolean {
  return r.unit === "count" || r.unit === undefined;
}

function isRate(r: CrimeRecord): boolean {
  return r.unit === "rate_per_10k";
}

// ── Public API ────────────────────────────────────────────────────────────────

export function getStats(): DataStats {
  const json = loadCrimesJson();
  if (!json || json.totalRecords === 0) {
    return {
      totalRecords: 0, totalCount: 0, totalRateRecords: 0,
      yearRange: [2018, 2025], countYearRange: null,
      years: [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025],
      crimeTypes: ["homicidio", "robo", "hurto", "narcotrafico", "violacion"],
      provinces: Object.keys(PROVINCE_META),
      cantonCount: 0, districtCount: 0, sourceFiles: 0, generatedAt: null, isReal: false,
    };
  }
  const records = json.records;
  const years = [...new Set(records.map((r) => r.year))].sort((a, b) => a - b);

  const countRecs = records.filter(isCount);
  const rateRecs  = records.filter(isRate);
  const countYears = [...new Set(countRecs.map((r) => r.year))].sort((a, b) => a - b);

  const totalCount = countRecs.reduce((s, r) => s + r.count, 0);
  const cantonCount = new Set(
    countRecs.filter((r) => r.canton).map((r) => r.canton!)
  ).size || new Set(
    records.filter((r) => r.canton).map((r) => r.canton!)
  ).size;

  const districtCount = new Set(
    records
      .filter((r) => r.district)
      .map((r) => `${r.province}/${r.canton}/${r.district}`)
  ).size;

  return {
    totalRecords: json.totalRecords,
    totalCount,
    totalRateRecords: rateRecs.length,
    yearRange: [years[0], years[years.length - 1]],
    countYearRange: countYears.length ? [countYears[0], countYears[countYears.length - 1]] : null,
    years,
    crimeTypes: [...new Set(records.map((r) => r.crimeType))].sort(),
    provinces: Object.keys(PROVINCE_META),
    cantonCount,
    districtCount,
    sourceFiles: json.sourceFiles,
    generatedAt: json.generatedAt,
    isReal: true,
  };
}

export function getProvinces(): { provinces: ProvinceData[]; isReal: boolean } {
  const json = loadCrimesJson();
  if (!json || json.totalRecords === 0) return { provinces: MOCK_PROVINCES, isReal: false };

  // Prefer count-based records; fall back to rate-based if no count data
  const countRecs = json.records.filter(isCount);
  const rateRecs  = json.records.filter(isRate);

  const useCount = countRecs.length > 0;
  const working  = useCount ? countRecs : rateRecs;

  const annualRecords = working.filter((r) => r.period === "Anual");
  const semRecords    = working.filter((r) => r.period.includes("Semestre"));

  // Pick best year: prefer annual, else latest semestre
  const annualYears = [...new Set(annualRecords.map((r) => r.year))].sort((a, b) => b - a);
  const semYears    = [...new Set(semRecords.map((r) => r.year))].sort((a, b) => b - a);
  const latestYear  = annualYears[0] ?? semYears[0];
  const prevYear    = annualYears[1] ?? annualYears[0];

  // Pool: annual records for latestYear; if none, use semestre
  const pool = annualRecords.filter((r) => r.year === latestYear).length > 0
    ? annualRecords.filter((r) => r.year === latestYear)
    : working.filter((r) => r.year === latestYear);

  const prevPool = annualRecords.filter((r) => r.year === prevYear);

  const sumFor = (records: CrimeRecord[], province: string, crime: string) =>
    records
      .filter((r) => r.province === province && r.crimeType === crime && !r.canton)
      .reduce((s, r) => s + r.count, 0);

  const provinces: ProvinceData[] = Object.entries(PROVINCE_META).map(([name, meta]) => {
    const crimes = {
      homicidio:    sumFor(pool, name, "homicidio"),
      robo:         sumFor(pool, name, "robo"),
      agresion:     sumFor(pool, name, "agresion"),
      narcotrafico: sumFor(pool, name, "narcotrafico"),
      hurto:        sumFor(pool, name, "hurto"),
    };
    const total = Object.values(crimes).reduce((s, v) => s + v, 0);
    const rate = parseFloat(((total / meta.population) * 100000).toFixed(1));

    let trend = 0;
    if (prevYear && prevYear !== latestYear) {
      const prevTotal = (["homicidio","robo","agresion","narcotrafico","hurto"] as const)
        .reduce((s, ct) => s + sumFor(prevPool, name, ct), 0);
      if (prevTotal > 0) trend = parseFloat((((total - prevTotal) / prevTotal) * 100).toFixed(1));
    }
    return { name, code: meta.code, population: meta.population, crimes, rate, trend };
  });

  return { provinces, isReal: true };
}

export function getYearTrend(): YearTrendPoint[] {
  const json = loadCrimesJson();
  if (!json) return [];

  // Group by year, respecting unit type
  const byYear = new Map<number, { counts: Record<string, number>; rates: Record<string, number> }>();

  for (const r of json.records) {
    if (!byYear.has(r.year)) byYear.set(r.year, { counts: {}, rates: {} });
    const entry = byYear.get(r.year)!;
    if (isCount(r)) {
      entry.counts[r.crimeType] = (entry.counts[r.crimeType] ?? 0) + r.count;
    } else {
      entry.rates[r.crimeType] = (entry.rates[r.crimeType] ?? 0) + r.count;
    }
  }

  return [...byYear.entries()]
    .map(([year, { counts, rates }]) => {
      const hasCount = Object.keys(counts).length > 0;
      const hasRate  = Object.keys(rates).length > 0;
      const src = hasCount ? counts : rates;
      return {
        year,
        homicidio:    src.homicidio    ?? 0,
        robo:         src.robo         ?? 0,
        hurto:        src.hurto        ?? 0,
        narcotrafico: src.narcotrafico ?? 0,
        violacion:    src.violacion    ?? 0,
        agresion:     src.agresion     ?? 0,
        total: Object.values(src).reduce((s, v) => s + v, 0),
        unit: hasCount && hasRate ? "mixed" : hasCount ? "count" : "rate_per_10k",
      } as YearTrendPoint;
    })
    .sort((a, b) => a.year - b.year);
}

export function getCantonRankings(): CantonData[] {
  const json = loadCrimesJson();
  if (!json) return [];

  // Prefer canton data from count records, fall back to rate records
  const countCantonRecs = json.records.filter((r) => r.canton && isCount(r));
  const rateCantonRecs  = json.records.filter((r) => r.canton && isRate(r));
  const cantonRecs = countCantonRecs.length > 0 ? countCantonRecs : rateCantonRecs;

  const map = new Map<string, CantonData>();
  for (const r of cantonRecs) {
    const key = `${r.province}||${r.canton}`;
    if (!map.has(key)) map.set(key, { canton: r.canton!, province: r.province, crimes: {}, total: 0 });
    const entry = map.get(key)!;
    entry.crimes[r.crimeType] = (entry.crimes[r.crimeType] ?? 0) + r.count;
    entry.total += r.count;
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

export interface DistrictData {
  district: string;
  canton: string;
  province: string;
  crimes: Record<string, number>;
  total: number;
}

export function getDistrictRankings(province?: string): DistrictData[] {
  const json = loadCrimesJson();
  if (!json) return [];

  // Use rate records (Excel data is where district detail lives)
  let districtRecs = json.records.filter((r) => r.district && r.canton);
  if (province) districtRecs = districtRecs.filter((r) => r.province === province);

  const map = new Map<string, DistrictData>();
  for (const r of districtRecs) {
    const key = `${r.province}||${r.canton}||${r.district}`;
    if (!map.has(key)) {
      map.set(key, {
        district: r.district!,
        canton: r.canton!,
        province: r.province,
        crimes: {},
        total: 0,
      });
    }
    const entry = map.get(key)!;
    entry.crimes[r.crimeType] = (entry.crimes[r.crimeType] ?? 0) + r.count;
    entry.total += r.count;
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

export function getAllRecords(): CrimeRecord[] {
  const json = loadCrimesJson();
  return json?.records ?? [];
}

export function getDataSources(): ManifestEntry[] {
  return loadManifest().sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
}

export function getCrimeTotals(): Record<string, number> {
  const json = loadCrimesJson();
  if (!json) return {};
  // Only sum count-based records
  const totals: Record<string, number> = {};
  for (const r of json.records.filter(isCount)) {
    totals[r.crimeType] = (totals[r.crimeType] ?? 0) + r.count;
  }
  return totals;
}

/** Province-level count summary for latest available year (count-based records only) */
export function getProvinceCountSummary(): {
  year: number;
  period: string;
  data: Record<string, Record<string, number>>;
} | null {
  const json = loadCrimesJson();
  if (!json) return null;

  const countRecs = json.records.filter(isCount);
  if (countRecs.length === 0) return null;

  // Find latest annual records
  const annualRecs = countRecs.filter((r) => r.period === "Anual");
  const years = [...new Set(annualRecs.map((r) => r.year))].sort((a, b) => b - a);

  let bestRecs = annualRecs.filter((r) => r.year === years[0]);
  let year = years[0];
  let period = "Anual";

  if (bestRecs.length === 0) {
    // Fall back to any period
    const allYears = [...new Set(countRecs.map((r) => r.year))].sort((a, b) => b - a);
    year = allYears[0];
    period = countRecs.filter((r) => r.year === year)[0]?.period ?? "";
    bestRecs = countRecs.filter((r) => r.year === year);
  }

  const data: Record<string, Record<string, number>> = {};
  for (const r of bestRecs.filter((r) => !r.canton)) {
    if (!data[r.province]) data[r.province] = {};
    data[r.province][r.crimeType] = (data[r.province][r.crimeType] ?? 0) + r.count;
  }
  return { year, period, data };
}
