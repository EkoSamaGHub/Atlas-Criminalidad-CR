import type { Metadata } from "next";
import { getAllRecords, getStats } from "@/lib/data";
import DataExplorer from "./DataExplorer";

export const metadata: Metadata = { title: "Explorador de Datos" };

export default function DatosPage() {
  const records = getAllRecords();
  const stats   = getStats();
  return <DataExplorer records={records} stats={stats} />;
}
