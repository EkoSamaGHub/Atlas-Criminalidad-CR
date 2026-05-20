import { getProvinces, getStats } from "@/lib/data";
import AtlasClient from "./AtlasClient";

export default function AtlasPage() {
  const { provinces } = getProvinces();
  const stats = getStats();

  return <AtlasClient provinces={provinces} stats={stats} />;
}
