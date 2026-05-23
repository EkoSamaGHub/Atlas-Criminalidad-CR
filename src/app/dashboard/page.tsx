import type { Metadata } from "next";
import { getYearTrend, getCantonRankings, getProvinces, getCrimeTotals, getStats, getProvinceAggregateCrimes, hasCrimeCountData, getRateSummaryYear } from "@/lib/data";
import DashboardClient from "./DashboardClient";

export const metadata: Metadata = { title: "Dashboard Estadístico" };

export default function DashboardPage() {
  const trend              = getYearTrend();
  const cantons            = getCantonRankings();
  const { provinces }      = getProvinces();
  const crimeTotals        = getCrimeTotals();
  const stats              = getStats();
  const provinceAggregates = getProvinceAggregateCrimes();
  const hasCountData       = hasCrimeCountData();
  const rateSummaryYear    = getRateSummaryYear();
  return (
    <DashboardClient
      trend={trend}
      cantons={cantons}
      provinces={provinces}
      crimeTotals={crimeTotals}
      provinceAggregates={provinceAggregates}
      hasCountData={hasCountData}
      rateSummaryYear={rateSummaryYear}
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
