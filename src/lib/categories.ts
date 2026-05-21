export type CrimeCategory = "homicidio" | "robo" | "narcotrafico" | "hurto" | "violacion";

export interface ProvinceData {
  name: string;
  code: string;
  population: number;
  crimes: Record<CrimeCategory, number>;
  rate: number;
  trend: number;
  dataYear?: number;
}

export const CATEGORIES: { key: CrimeCategory; label: string; color: string }[] = [
  { key: "homicidio",    label: "Homicidios",   color: "#ef4444" },
  { key: "robo",         label: "Robos",         color: "#f97316" },
  { key: "narcotrafico", label: "Narcotráfico",  color: "#8b5cf6" },
  { key: "hurto",        label: "Hurtos",        color: "#3b82f6" },
  { key: "violacion",    label: "Violaciones",   color: "#ec4899" },
];

export const CRIME_COLORS: Record<string, string> = {
  homicidio:    "#ef4444",
  robo:         "#f97316",
  hurto:        "#3b82f6",
  narcotrafico: "#8b5cf6",
  violacion:    "#ec4899",
  agresion:     "#eab308",
  extorsion:    "#f43f5e",
};

export function provinceSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[áàä]/g, "a")
    .replace(/[éèë]/g, "e")
    .replace(/[íìï]/g, "i")
    .replace(/[óòö]/g, "o")
    .replace(/[úùü]/g, "u");
}
