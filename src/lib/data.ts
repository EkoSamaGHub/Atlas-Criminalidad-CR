/**
 * Data layer for the OIJ Atlas frontend.
 * Reads from public/data/crimes.json when available (populated by scrape + process scripts).
 * Falls back to mock data so the UI always works.
 */
import fs from "fs";
import path from "path";
import {
  PROVINCES as MOCK_PROVINCES,
  MONTHLY_TREND,
  CATEGORIES,
  type ProvinceData,
  type CrimeCategory,
} from "./mockData";

export { MONTHLY_TREND, CATEGORIES };
export type { ProvinceData, CrimeCategory };

interface CrimesJson {
  generatedAt: string;
  sourceFiles: number;
  totalRecords: number;
  provinces: Record<string, Record<string, number>>;
  yearTrend: Record<string, Record<string, number>>;
}

function loadCrimesJson(): CrimesJson | null {
  try {
    const filePath = path.join(process.cwd(), "public", "data", "crimes.json");
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as CrimesJson;
  } catch {
    return null;
  }
}

const PROVINCE_META: Record<string, { code: string; population: number }> = {
  "San José":   { code: "SJ", population: 1404242 },
  Alajuela:     { code: "AL", population: 1002614 },
  Cartago:      { code: "CA", population: 539925 },
  Heredia:      { code: "HE", population: 476011 },
  Guanacaste:   { code: "GU", population: 354083 },
  Puntarenas:   { code: "PU", population: 476021 },
  Limón:        { code: "LI", population: 428391 },
};

function buildFromRealData(json: CrimesJson): ProvinceData[] {
  return Object.entries(json.provinces)
    .filter(([name]) => PROVINCE_META[name])
    .map(([name, crimes]) => {
      const meta = PROVINCE_META[name];
      const total = Object.values(crimes).reduce((s, v) => s + v, 0);
      const rate = parseFloat(((total / meta.population) * 100000).toFixed(1));
      return {
        name,
        code: meta.code,
        population: meta.population,
        crimes: {
          homicidio: crimes.homicidio ?? 0,
          robo: crimes.robo ?? 0,
          agresion: crimes.agresion ?? 0,
          narcotrafico: crimes.narcotrafico ?? 0,
          hurto: crimes.hurto ?? 0,
        },
        rate,
        trend: 0,
      } satisfies ProvinceData;
    });
}

export function getProvinces(): { provinces: ProvinceData[]; isReal: boolean } {
  const json = loadCrimesJson();
  if (json && json.totalRecords > 0) {
    const provinces = buildFromRealData(json);
    if (provinces.length > 0) return { provinces, isReal: true };
  }
  return { provinces: MOCK_PROVINCES, isReal: false };
}

export function getDataMeta(): { generatedAt: string | null; sourceFiles: number; totalRecords: number } {
  const json = loadCrimesJson();
  return {
    generatedAt: json?.generatedAt ?? null,
    sourceFiles: json?.sourceFiles ?? 0,
    totalRecords: json?.totalRecords ?? 0,
  };
}
