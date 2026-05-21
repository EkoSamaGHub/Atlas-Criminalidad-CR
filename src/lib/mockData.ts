export * from "./categories";

import type { ProvinceData } from "./categories";

// Mock fallback data — used only when crimes.json is absent
export const PROVINCES: ProvinceData[] = [
  { name: "San José",   code: "SJ", population: 1404242, crimes: { homicidio: 312, robo: 8540, agresion: 4210, narcotrafico: 1820, hurto: 11200 }, rate: 42.1, trend: -3.2 },
  { name: "Alajuela",   code: "AL", population: 1002614, crimes: { homicidio: 198, robo: 4820, agresion: 2940, narcotrafico: 980,  hurto: 6300  }, rate: 36.8, trend:  1.4 },
  { name: "Cartago",    code: "CA", population: 539925,  crimes: { homicidio: 74,  robo: 2100, agresion: 1340, narcotrafico: 420,  hurto: 2980  }, rate: 28.4, trend: -1.1 },
  { name: "Heredia",    code: "HE", population: 476011,  crimes: { homicidio: 68,  robo: 2640, agresion: 1180, narcotrafico: 510,  hurto: 3450  }, rate: 31.2, trend:  2.8 },
  { name: "Guanacaste", code: "GU", population: 354083,  crimes: { homicidio: 91,  robo: 3240, agresion: 1870, narcotrafico: 1240, hurto: 2800  }, rate: 48.7, trend:  6.1 },
  { name: "Puntarenas", code: "PU", population: 476021,  crimes: { homicidio: 134, robo: 3980, agresion: 2210, narcotrafico: 1680, hurto: 3900  }, rate: 51.3, trend:  4.2 },
  { name: "Limón",      code: "LI", population: 428391,  crimes: { homicidio: 178, robo: 4120, agresion: 2680, narcotrafico: 2240, hurto: 4200  }, rate: 62.8, trend:  8.9 },
];

export function totalCrimes(p: ProvinceData): number {
  return Object.values(p.crimes).reduce((a, b) => a + b, 0);
}
