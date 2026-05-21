import type { Metadata } from "next";
import { getStats, getYearTrend, getProvinces, getCantonRankings, getCrimeTotals } from "@/lib/data";
import AnalisisClient from "./AnalisisClient";

export const metadata: Metadata = {
  title: "Análisis IA",
  description: "Análisis inteligente con IA de los datos criminales de Costa Rica 2018–2025",
};

export default function AnalisisPage() {
  const stats = getStats();
  const trend = getYearTrend();
  const { provinces, isReal } = getProvinces();
  const cantons = getCantonRankings().slice(0, 10);
  const crimeTotals = getCrimeTotals();

  return (
    <AnalisisClient
      stats={stats}
      trend={trend}
      provinces={provinces}
      cantons={cantons}
      crimeTotals={crimeTotals}
      isReal={isReal}
    />
  );
}
