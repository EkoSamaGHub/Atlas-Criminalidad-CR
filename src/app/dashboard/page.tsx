import type { Metadata } from "next";
import { getYearTrend, getCantonRankings, getProvinces, getCrimeTotals, getStats } from "@/lib/data";
import DashboardClient from "./DashboardClient";

export const metadata: Metadata = { title: "Dashboard Estadístico" };

export default function DashboardPage() {
  const trend         = getYearTrend();
  const cantons       = getCantonRankings();
  const { provinces } = getProvinces();
  const crimeTotals   = getCrimeTotals();
  const stats         = getStats();
  return (
    <DashboardClient
      trend={trend}
      cantons={cantons}
      provinces={provinces}
      crimeTotals={crimeTotals}
      stats={{
        totalRecords: stats.totalRecords,
        totalCount:   stats.totalCount,
        sourceFiles:  stats.sourceFiles,
        yearRange:    stats.yearRange,
        cantonCount:  stats.cantonCount,
      }}
    />
  );
}
