import type { Metadata } from "next";
import { getProvinces, getStats, getProvincesByYear, getRateYears } from "@/lib/data";
import AtlasClient from "./AtlasClient";

export const metadata: Metadata = { title: "Atlas Interactivo" };

export default function AtlasPage() {
  const { provinces } = getProvinces();
  const stats = getStats();
  const yearData = getProvincesByYear();
  const rateYears = [...getRateYears()];

  return <AtlasClient provinces={provinces} stats={stats} yearData={yearData} rateYears={rateYears} />;
}
