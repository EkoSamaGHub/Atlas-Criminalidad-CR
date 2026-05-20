import { getAllRecords, getStats } from "@/lib/data";
import DataExplorer from "./DataExplorer";

export default function DatosPage() {
  const records = getAllRecords();
  const stats   = getStats();
  return <DataExplorer records={records} stats={stats} />;
}
