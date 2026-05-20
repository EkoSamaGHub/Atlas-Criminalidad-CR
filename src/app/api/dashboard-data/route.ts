import { NextResponse } from "next/server";
import { getYearTrend, getCantonRankings, getProvinces, getCrimeTotals, getStats } from "@/lib/data";

export const dynamic = "force-static";

export function GET() {
  const trend       = getYearTrend();
  const cantons     = getCantonRankings();
  const { provinces } = getProvinces();
  const crimeTotals = getCrimeTotals();
  const stats       = getStats();
  return NextResponse.json({ trend, cantons, provinces, crimeTotals, stats });
}
