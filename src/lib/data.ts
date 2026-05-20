/**
 * Central data layer — reads crimes.json + manifest.json at server render time.
 * Falls back to mock data when no real data exists yet.
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
  crimeType: string;
  count: number;
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
  total: number;
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
  totalCount: number;
  yearRange: [number, number];
  years: number[];
  crimeTypes: string[];
  provinces: string[];
  cantonCount: number;
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

const PROVINCE_META: Record<string, { code: string; population: number }> = {
  "San José":   { code: "SJ", population: 1404242 },
  Alajuela:     { code: "AL", population: 1002614 },
  Cartago:      { code: "CA", population: 539925 },
  Heredia:      { code: "HE", population: 476011 },
  Guanacaste:   { code: "GU", population: 354083 },
  Puntarenas:   { code: "PU", population: 476021 },
  Limón:        { code: "LI", population: 428391 },
};

// ── Public API ────────────────────────────────────────────────────────────────

export function getStats(): DataStats {
  const json = loadCrimesJson();
  if (!json || json.totalRecords === 0) {
    return {
      totalRecords: 0,
      totalCount: 0,
      yearRange: [2018, 2022],
      years: [2018, 2019, 2020, 2021, 2022],
      crimeTypes: ["homicidio", "robo", "hurto", "narcotrafico", "violacion"],
      provinces: Object.keys(PROVINCE_META),
      cantonCount: 0,
      sourceFiles: 0,
      generatedAt: null,
      isReal: false,
    };
  }
  const records = json.records;
  const years = [...new Set(records.map((r) => r.year))].sort((a, b) => a - b);
  const totalCount = records.reduce((s, r) => s + r.count, 0);
  const cantonCount = new Set(records.filter((r) => r.canton).map((r) => r.canton!)).size;
  return {
    totalRecords: json.totalRecords,
    totalCount,
    yearRange: [years[0], years[years.length - 1]],
    years,
    crimeTypes: [...new Set(records.map((r) => r.crimeType))],
    provinces: Object.keys(PROVINCE_META),
    cantonCount,
    sourceFiles: json.sourceFiles,
    generatedAt: json.generatedAt,
    isReal: true,
  };
}

export function getProvinces(): { provinces: ProvinceData[]; isReal: boolean } {
  const json = loadCrimesJson();
  if (!json || json.totalRecords === 0) return { provinces: MOCK_PROVINCES, isReal: false };

  // Use most recent annual year
  const annualRecords = json.records.filter((r) => r.period === "Anual");
  const years = [...new Set(annualRecords.map((r) => r.year))].sort((a, b) => b - a);
  const latestYear = years[0];
  const prevYear = years[1];

  const sumFor = (year: number, province: string, crime: string) =>
    annualRecords
      .filter((r) => r.year === year && r.province === province && r.crimeType === crime && !r.canton)
      .reduce((s, r) => s + r.count, 0);

  const provinces: ProvinceData[] = Object.entries(PROVINCE_META).map(([name, meta]) => {
    const crimes = {
      homicidio: sumFor(latestYear, name, "homicidio") || json.provinces[name]?.homicidio || 0,
      robo: sumFor(latestYear, name, "robo") || json.provinces[name]?.robo || 0,
      agresion: sumFor(latestYear, name, "agresion") || json.provinces[name]?.agresion || 0,
      narcotrafico: sumFor(latestYear, name, "narcotrafico") || json.provinces[name]?.narcotrafico || 0,
      hurto: sumFor(latestYear, name, "hurto") || json.provinces[name]?.hurto || 0,
    };
    const total = Object.values(crimes).reduce((s, v) => s + v, 0);
    const rate = parseFloat(((total / meta.population) * 100000).toFixed(1));

    let trend = 0;
    if (prevYear) {
      const prevTotal = (["homicidio","robo","agresion","narcotrafico","hurto"] as const)
        .reduce((s, ct) => s + (sumFor(prevYear, name, ct) || 0), 0);
      if (prevTotal > 0) trend = parseFloat((((total - prevTotal) / prevTotal) * 100).toFixed(1));
    }
    return { name, code: meta.code, population: meta.population, crimes, rate, trend };
  });

  return { provinces, isReal: true };
}

export function getYearTrend(): YearTrendPoint[] {
  const json = loadCrimesJson();
  if (!json) return [];
  return Object.entries(json.yearTrend)
    .map(([yearStr, crimes]) => ({
      year: parseInt(yearStr),
      homicidio: crimes.homicidio ?? 0,
      robo: crimes.robo ?? 0,
      hurto: crimes.hurto ?? 0,
      narcotrafico: crimes.narcotrafico ?? 0,
      violacion: crimes.violacion ?? 0,
      total: Object.values(crimes).reduce((s, v) => s + v, 0),
    }))
    .sort((a, b) => a.year - b.year);
}

export function getCantonRankings(): CantonData[] {
  const json = loadCrimesJson();
  if (!json) return [];
  const map = new Map<string, CantonData>();
  for (const r of json.records) {
    if (!r.canton) continue;
    const key = `${r.province}||${r.canton}`;
    if (!map.has(key)) map.set(key, { canton: r.canton, province: r.province, crimes: {}, total: 0 });
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
  const totals: Record<string, number> = {};
  for (const r of json.records) {
    totals[r.crimeType] = (totals[r.crimeType] ?? 0) + r.count;
  }
  return totals;
}
