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
import { PROVINCES as MOCK_PROVINCES } from "./mockData";
import { CATEGORIES, type ProvinceData, type CrimeCategory, CRIME_COLORS, provinceSlug } from "./categories";

export { CATEGORIES, CRIME_COLORS, provinceSlug };
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
  reference_only?: boolean;
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

const KNOWN_PROVINCES = new Set(Object.keys(PROVINCE_META));

// Artifact names that appear due to PDF parsing (row headers, totals, etc.)
const JUNK_CANTON_NAMES = new Set(["total", "porcentajes", "subtotal", "grand total", "suma", "totales"]);

function isValidCantonName(name: string): boolean {
  const t = name.trim().toLowerCase();
  if (!t) return false;
  if (/^\d+$/.test(t)) return false;        // purely numeric → junk ID
  if (JUNK_CANTON_NAMES.has(t)) return false;
  return true;
}

function normalizeCanton(name: string): string {
  return name.trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

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

  // Exclude canton records from totalCount: province-level totals already include them.
  const totalCount = countRecs.filter((r) => !r.canton).reduce((s, r) => s + r.count, 0);
  const validCantonRecs = (recs: CrimeRecord[]) =>
    recs.filter((r) => r.canton && isValidCantonName(r.canton) && KNOWN_PROVINCES.has(r.province));
  const cantonCount = new Set(
    validCantonRecs(countRecs).map((r) => normalizeCanton(r.canton!))
  ).size || new Set(
    validCantonRecs(records).map((r) => normalizeCanton(r.canton!))
  ).size;

  const districtCount = new Set(
    records
      .filter((r) => r.district)
      .map((r) => `${r.province}/${r.canton}/${r.district}`)
  ).size;

  const manifestCount = loadManifest().length;

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
    sourceFiles: manifestCount || json.sourceFiles,
    generatedAt: json.generatedAt,
    isReal: true,
  };
}

export function getProvinces(): { provinces: ProvinceData[]; isReal: boolean } {
  const json = loadCrimesJson();
  if (!json || json.totalRecords === 0) return { provinces: MOCK_PROVINCES, isReal: false };

  const countRecs = json.records.filter(isCount);
  const rateRecs  = json.records.filter(isRate);

  const pickPool = (recs: CrimeRecord[]) => {
    const annual = recs.filter((r) => r.period === "Anual");
    const years = [...new Set(annual.map((r) => r.year))].sort((a, b) => b - a);
    if (years.length === 0) {
      const allYears = [...new Set(recs.map((r) => r.year))].sort((a, b) => b - a);
      const ly = allYears[0]; const py = allYears[1] ?? allYears[0];
      return { pool: recs.filter((r) => r.year === ly), prevPool: recs.filter((r) => r.year === py), latestYear: ly, prevYear: py };
    }
    const latestYear = years[0];
    const prevYear = years[1] ?? years[0];
    return {
      pool: annual.filter((r) => r.year === latestYear),
      prevPool: annual.filter((r) => r.year === prevYear),
      latestYear,
      prevYear,
    };
  };

  // Find the global reference year: the most recent year that has annual count
  // data for the most provinces.  This ensures the province table compares
  // like-for-like instead of mixing e.g. 2016 Guanacaste with 2024 San José.
  const globalYear = (() => {
    const annualProv = countRecs.filter((r) => r.period === "Anual" && !r.canton);
    const yearProvMap = new Map<number, Set<string>>();
    for (const r of annualProv) {
      if (!yearProvMap.has(r.year)) yearProvMap.set(r.year, new Set());
      yearProvMap.get(r.year)!.add(r.province);
    }
    if (!yearProvMap.size) return null;
    // Sort: most provinces first, then most recent year as tie-breaker
    return [...yearProvMap.entries()]
      .sort((a, b) => b[1].size - a[1].size || b[0] - a[0])[0][0];
  })();

  // For each crime type, use the global year when the province has data for it,
  // otherwise fall back to the province's own latest annual year.
  // Use max (not sum) to avoid double-counting when the same total appears in
  // multiple source publications.
  const latestForCrime = (recs: CrimeRecord[], crimeType: string, preferYear: number | null): number => {
    const annual = recs.filter((r) => r.crimeType === crimeType && r.period === "Anual" && !r.canton);
    if (!annual.length) return 0;
    if (preferYear) {
      const forYear = annual.filter((r) => r.year === preferYear);
      if (forYear.length) return Math.max(...forYear.map((r) => r.count));
    }
    const years = [...new Set(annual.map((r) => r.year))].sort((a, b) => b - a);
    const latest = annual.filter((r) => r.year === years[0]);
    return latest.length === 0 ? 0 : Math.max(...latest.map((r) => r.count));
  };

  // Determine the effective data year for a province (the year actually used)
  const effectiveYear = (pool: CrimeRecord[], preferYear: number | null): number | undefined => {
    const annual = pool.filter((r) => r.period === "Anual" && !r.canton);
    if (!annual.length) return undefined;
    if (preferYear && annual.some((r) => r.year === preferYear)) return preferYear;
    const years = [...new Set(annual.map((r) => r.year))].sort((a, b) => b - a);
    return years[0];
  };

  const DISPLAYED: CrimeCategory[] = ["homicidio", "robo", "narcotrafico", "hurto", "violacion"];

  const provinces: ProvinceData[] = Object.entries(PROVINCE_META).map(([name, meta]) => {
    const provCount = countRecs.filter((r) => r.province === name);
    const provRate  = rateRecs.filter((r) => r.province === name);
    const pool = provCount.length > 0 ? provCount : provRate;

    const crimes = Object.fromEntries(
      DISPLAYED.map((ct) => [ct, latestForCrime(pool, ct, globalYear)])
    ) as Record<CrimeCategory, number>;

    const total = Object.values(crimes).reduce((s, v) => s + v, 0);
    const rate  = parseFloat(((total / meta.population) * 100000).toFixed(1));
    const dataYear = effectiveYear(pool, globalYear);

    // Trend: compare two most recent years that share the same dominant crime type
    const { pool: trendPool, prevPool, latestYear, prevYear } = pickPool(pool);
    const sumPool = (p: CrimeRecord[]) =>
      DISPLAYED.reduce((s, ct) => s + p.filter((r) => r.crimeType === ct && !r.canton).reduce((a, r) => a + r.count, 0), 0);
    const prevTotal = sumPool(prevPool);
    const trend = prevYear && prevYear !== latestYear && prevTotal > 0
      ? parseFloat((((sumPool(trendPool) - prevTotal) / prevTotal) * 100).toFixed(1))
      : 0;

    return { name, code: meta.code, population: meta.population, crimes, rate, trend, dataYear };
  });

  return { provinces, isReal: true };
}

export function getYearTrend(): YearTrendPoint[] {
  const json = loadCrimesJson();
  if (!json) return [];

  // Group by year, respecting unit type.
  // Exclude canton-level records: province-level totals already include them.
  const byYear = new Map<number, { counts: Record<string, number>; rates: Record<string, number> }>();

  for (const r of json.records.filter((r) => !r.canton)) {
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

let _cantonCache: CantonData[] | undefined;

export function getCantonRankings(): CantonData[] {
  if (_cantonCache) return _cantonCache;
  const json = loadCrimesJson();
  if (!json) return [];

  // Use rate records exclusively: 99%+ of canton data comes from Excel rate records.
  // Mixing count (absolute) and rate (per-10k) records produces meaningless totals.
  const allCantonRecs = json.records.filter((r) =>
    r.canton &&
    isValidCantonName(r.canton) &&
    KNOWN_PROVINCES.has(r.province)
  );
  const hasRateCantons = allCantonRecs.some(isRate);
  const cantonRecs = hasRateCantons
    ? allCantonRecs.filter(isRate)
    : allCantonRecs.filter(isCount);

  const map = new Map<string, CantonData>();
  for (const r of cantonRecs) {
    const normalized = normalizeCanton(r.canton!);
    const key = `${r.province}||${normalized}`;
    if (!map.has(key)) map.set(key, { canton: normalized, province: r.province, crimes: {}, total: 0 });
    const entry = map.get(key)!;
    entry.crimes[r.crimeType] = (entry.crimes[r.crimeType] ?? 0) + r.count;
    entry.total += r.count;
  }
  _cantonCache = [...map.values()].sort((a, b) => b.total - a.total);
  return _cantonCache;
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

let _recordsCache: CrimeRecord[] | undefined;

export function getAllRecords(): CrimeRecord[] {
  if (_recordsCache) return _recordsCache;
  const json = loadCrimesJson();
  _recordsCache = json?.records ?? [];
  return _recordsCache;
}

export function getDataSources(): ManifestEntry[] {
  return loadManifest().sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
}

/** Returns the year with the best province coverage in annual rate records. */
function bestRateYear(recs: CrimeRecord[]): number | null {
  const annual = recs.filter((r) => r.period === "Anual" && !r.canton && KNOWN_PROVINCES.has(r.province));
  if (!annual.length) return null;
  const ypMap = new Map<number, Set<string>>();
  for (const r of annual) {
    if (!ypMap.has(r.year)) ypMap.set(r.year, new Set());
    ypMap.get(r.year)!.add(r.province);
  }
  return [...ypMap.entries()].sort((a, b) => b[1].size - a[1].size || b[0] - a[0])[0][0];
}

/** Returns the year currently used for rate-based province summaries. */
export function getRateSummaryYear(): number | null {
  const json = loadCrimesJson();
  if (!json) return null;
  return bestRateYear(json.records.filter(isRate));
}

/** Returns true when the dataset has verified absolute crime counts (not just rates). */
export function hasCrimeCountData(): boolean {
  const json = loadCrimesJson();
  if (!json) return false;
  return json.records.some(isCount);
}

let _crimeTotalsCache: Record<string, number> | undefined;

/**
 * Crime totals for KPI display.
 * Uses absolute counts when available; falls back to rate_per_10k values
 * from the most recent annual year with full province coverage.
 */
export function getCrimeTotals(): Record<string, number> {
  if (_crimeTotalsCache) return _crimeTotalsCache;
  const json = loadCrimesJson();
  if (!json) return {};
  const totals: Record<string, number> = {};

  const countRecs = json.records.filter((r) => isCount(r) && !r.canton);
  if (countRecs.length > 0) {
    for (const r of countRecs) {
      totals[r.crimeType] = (totals[r.crimeType] ?? 0) + r.count;
    }
  } else {
    // Fall back to rates from the most representative year.
    // Use the max value across provinces per crime type so the KPI reflects
    // the highest observed provincial rate (a meaningful headline figure).
    const rateRecs = json.records.filter(isRate);
    const year = bestRateYear(rateRecs);
    if (year) {
      const forYear = rateRecs.filter((r) => r.year === year && !r.canton && r.period === "Anual");
      for (const r of forYear) {
        totals[r.crimeType] = Math.max(totals[r.crimeType] ?? 0, r.count);
      }
    }
  }

  _crimeTotalsCache = totals;
  return _crimeTotalsCache;
}

/**
 * Province crime summary table.
 * Uses absolute counts when available; falls back to rate_per_10k records
 * from the most recent annual year with full province coverage.
 */
export function getProvinceAggregateCrimes(): Record<string, Record<string, number>> {
  const json = loadCrimesJson();
  if (!json) return {};

  const countRecs = json.records.filter(isCount).filter(
    (r) => !r.canton && KNOWN_PROVINCES.has(r.province)
  );

  if (countRecs.length > 0) {
    // For each province × crimeType × year, take the max (dedup within year)
    // then sum across years
    const map: Record<string, Record<string, Record<number, number>>> = {};
    for (const r of countRecs) {
      if (!map[r.province]) map[r.province] = {};
      if (!map[r.province][r.crimeType]) map[r.province][r.crimeType] = {};
      const cur = map[r.province][r.crimeType][r.year] ?? 0;
      map[r.province][r.crimeType][r.year] = Math.max(cur, r.count);
    }
    const result: Record<string, Record<string, number>> = {};
    for (const [prov, crimes] of Object.entries(map)) {
      result[prov] = {};
      for (const [ct, yearMap] of Object.entries(crimes)) {
        result[prov][ct] = Object.values(yearMap).reduce((s, v) => s + v, 0);
      }
    }
    return result;
  }

  // Fall back to rate records from the best annual year
  const rateProvRecs = json.records.filter(
    (r) => isRate(r) && !r.canton && r.period === "Anual" && KNOWN_PROVINCES.has(r.province)
  );
  const year = bestRateYear(rateProvRecs);
  if (!year) return {};

  const result: Record<string, Record<string, number>> = {};
  for (const r of rateProvRecs.filter((r) => r.year === year)) {
    if (!result[r.province]) result[r.province] = {};
    result[r.province][r.crimeType] = Math.max(result[r.province][r.crimeType] ?? 0, r.count);
  }
  return result;
}

/** Province data keyed by year — includes both count years and rate years with good coverage */
export function getProvincesByYear(): Record<number, ProvinceData[]> {
  const json = loadCrimesJson();
  if (!json) return {};

  const DISPLAYED: CrimeCategory[] = ["homicidio", "robo", "narcotrafico", "hurto", "violacion"];

  // Build province data for a pool of records for a specific year
  const buildProvinces = (pool: CrimeRecord[], year: number) =>
    Object.entries(PROVINCE_META).map(([name, meta]) => {
      const pRecs = pool.filter((r) => r.province === name);
      const crimes = Object.fromEntries(
        DISPLAYED.map((ct) => {
          const vals = pRecs.filter((r) => r.crimeType === ct).map((r) => r.count);
          return [ct, vals.length > 0 ? Math.max(...vals) : 0];
        })
      ) as Record<CrimeCategory, number>;
      const total = Object.values(crimes).reduce((s, v) => s + v, 0);
      const rate = parseFloat(((total / meta.population) * 100000).toFixed(1));
      return { name, code: meta.code, population: meta.population, crimes, rate, trend: 0, dataYear: year };
    });

  const result: Record<number, ProvinceData[]> = {};

  // Count records first (province-level annual)
  const countProvRecs = json.records.filter((r) =>
    isCount(r) && !r.canton && r.period === "Anual" && KNOWN_PROVINCES.has(r.province)
  );
  const countYears = [...new Set(countProvRecs.map((r) => r.year))];
  for (const year of countYears) {
    const pool = countProvRecs.filter((r) => r.year === year);
    const provinces = buildProvinces(pool, year);
    if (provinces.filter((p) => Object.values(p.crimes).some((v) => v > 0)).length >= 5) {
      result[year] = provinces;
    }
  }

  // Rate records (province-level annual) — add years not already covered
  const rateProvRecs = json.records.filter((r) =>
    isRate(r) && !r.canton && r.period === "Anual" && KNOWN_PROVINCES.has(r.province)
  );
  const rateYears = [...new Set(rateProvRecs.map((r) => r.year))];
  for (const year of rateYears) {
    if (result[year]) continue; // prefer count data when available
    const pool = rateProvRecs.filter((r) => r.year === year);
    const provinces = buildProvinces(pool, year);
    if (provinces.filter((p) => Object.values(p.crimes).some((v) => v > 0)).length >= 5) {
      result[year] = provinces;
    }
  }

  return result;
}

/** Years that have rate-per-10k data (not count-based) in getProvincesByYear */
export function getRateYears(): Set<number> {
  const json = loadCrimesJson();
  if (!json) return new Set();
  const rateYears = new Set(
    json.records
      .filter((r) => isRate(r) && !r.canton && r.period === "Anual" && KNOWN_PROVINCES.has(r.province))
      .map((r) => r.year)
  );
  return rateYears;
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
