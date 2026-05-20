export type CrimeCategory = "homicidio" | "robo" | "agresion" | "narcotrafico" | "hurto";

export interface ProvinceData {
  name: string;
  code: string;
  population: number;
  crimes: Record<CrimeCategory, number>;
  rate: number; // per 100k
  trend: number; // % change vs prior year
}

export const CATEGORIES: { key: CrimeCategory; label: string; color: string }[] = [
  { key: "homicidio", label: "Homicidios", color: "#ef4444" },
  { key: "robo", label: "Robos", color: "#f97316" },
  { key: "agresion", label: "Agresiones", color: "#eab308" },
  { key: "narcotrafico", label: "Narcotráfico", color: "#8b5cf6" },
  { key: "hurto", label: "Hurtos", color: "#3b82f6" },
];

export const PROVINCES: ProvinceData[] = [
  {
    name: "San José",
    code: "SJ",
    population: 1404242,
    crimes: { homicidio: 312, robo: 8540, agresion: 4210, narcotrafico: 1820, hurto: 11200 },
    rate: 42.1,
    trend: -3.2,
  },
  {
    name: "Alajuela",
    code: "AL",
    population: 1002614,
    crimes: { homicidio: 198, robo: 4820, agresion: 2940, narcotrafico: 980, hurto: 6300 },
    rate: 36.8,
    trend: 1.4,
  },
  {
    name: "Cartago",
    code: "CA",
    population: 539925,
    crimes: { homicidio: 74, robo: 2100, agresion: 1340, narcotrafico: 420, hurto: 2980 },
    rate: 28.4,
    trend: -1.1,
  },
  {
    name: "Heredia",
    code: "HE",
    population: 476011,
    crimes: { homicidio: 68, robo: 2640, agresion: 1180, narcotrafico: 510, hurto: 3450 },
    rate: 31.2,
    trend: 2.8,
  },
  {
    name: "Guanacaste",
    code: "GU",
    population: 354083,
    crimes: { homicidio: 91, robo: 3240, agresion: 1870, narcotrafico: 1240, hurto: 2800 },
    rate: 48.7,
    trend: 6.1,
  },
  {
    name: "Puntarenas",
    code: "PU",
    population: 476021,
    crimes: { homicidio: 134, robo: 3980, agresion: 2210, narcotrafico: 1680, hurto: 3900 },
    rate: 51.3,
    trend: 4.2,
  },
  {
    name: "Limón",
    code: "LI",
    population: 428391,
    crimes: { homicidio: 178, robo: 4120, agresion: 2680, narcotrafico: 2240, hurto: 4200 },
    rate: 62.8,
    trend: 8.9,
  },
];

export const MONTHLY_TREND = [
  { month: "Ene", homicidio: 88, robo: 2340, agresion: 1180 },
  { month: "Feb", homicidio: 76, robo: 2100, agresion: 1040 },
  { month: "Mar", homicidio: 92, robo: 2480, agresion: 1320 },
  { month: "Abr", homicidio: 84, robo: 2620, agresion: 1210 },
  { month: "May", homicidio: 97, robo: 2780, agresion: 1390 },
  { month: "Jun", homicidio: 105, robo: 3010, agresion: 1480 },
  { month: "Jul", homicidio: 112, robo: 3240, agresion: 1560 },
  { month: "Ago", homicidio: 98, robo: 2990, agresion: 1420 },
  { month: "Set", homicidio: 89, robo: 2740, agresion: 1280 },
  { month: "Oct", homicidio: 94, robo: 2860, agresion: 1350 },
  { month: "Nov", homicidio: 101, robo: 3100, agresion: 1440 },
  { month: "Dic", homicidio: 119, robo: 3540, agresion: 1680 },
];

export function totalCrimes(p: ProvinceData): number {
  return Object.values(p.crimes).reduce((a, b) => a + b, 0);
}
