"use client";
import { useEffect, useRef, useState } from "react";
import { PROVINCES, CATEGORIES, type CrimeCategory, type ProvinceData } from "@/lib/mockData";

// Costa Rica province centroids for marker placement
const PROVINCE_COORDS: Record<string, [number, number]> = {
  SJ: [9.934739, -84.087502],
  AL: [10.39591, -84.438179],
  CA: [9.864477, -83.919826],
  HE: [10.473541, -84.016748],
  GU: [10.634006, -85.443298],
  PU: [9.981801, -84.831615],
  LI: [10.005432, -83.036415],
};

// Rough province polygon bounds (simplified rectangles for mock)
const PROVINCE_BOUNDS: Record<string, [[number, number], [number, number], [number, number], [number, number]]> = {
  SJ: [[9.6, -84.4], [9.6, -83.7], [10.2, -83.7], [10.2, -84.4]],
  AL: [[10.0, -84.8], [10.0, -84.0], [10.9, -84.0], [10.9, -84.8]],
  CA: [[9.5, -84.1], [9.5, -83.6], [10.0, -83.6], [10.0, -84.1]],
  HE: [[9.95, -84.3], [9.95, -83.8], [10.45, -83.8], [10.45, -84.3]],
  GU: [[9.9, -86.0], [9.9, -84.9], [11.1, -84.9], [11.1, -86.0]],
  PU: [[8.3, -85.1], [8.3, -84.3], [10.1, -84.3], [10.1, -85.1]],
  LI: [[8.5, -83.5], [8.5, -82.5], [11.2, -82.5], [11.2, -83.5]],
};

function getRateColor(rate: number): string {
  if (rate > 55) return "#ef4444";
  if (rate > 45) return "#f97316";
  if (rate > 35) return "#eab308";
  return "#22c55e";
}

interface Props {
  selectedCategory: CrimeCategory;
}

export default function CrimeMap({ selectedCategory }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const polygonsRef = useRef<L.Polygon[]>([]);
  const [selected, setSelected] = useState<ProvinceData | null>(null);
  const [L, setL] = useState<typeof import("leaflet") | null>(null);

  useEffect(() => {
    import("leaflet").then((leaflet) => {
      setL(leaflet);
    });
  }, []);

  useEffect(() => {
    if (!L || !mapRef.current || leafletMapRef.current) return;

    const map = L.map(mapRef.current, {
      center: [9.97, -84.2],
      zoom: 7,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    leafletMapRef.current = map;

    return () => {
      map.remove();
      leafletMapRef.current = null;
    };
  }, [L]);

  useEffect(() => {
    if (!L || !leafletMapRef.current) return;
    const map = leafletMapRef.current;

    polygonsRef.current.forEach((p) => p.remove());
    polygonsRef.current = [];

    PROVINCES.forEach((province) => {
      const coords = PROVINCE_BOUNDS[province.code];
      if (!coords) return;

      const crimeCount = province.crimes[selectedCategory];
      const maxInCategory = Math.max(...PROVINCES.map((p) => p.crimes[selectedCategory]));
      const opacity = 0.2 + (crimeCount / maxInCategory) * 0.6;
      const color = getRateColor(province.rate);

      const polygon = L.polygon(coords, {
        color: color,
        fillColor: color,
        fillOpacity: opacity,
        weight: 1.5,
        opacity: 0.8,
      });

      const catLabel = CATEGORIES.find((c) => c.key === selectedCategory)?.label ?? selectedCategory;

      polygon.bindPopup(`
        <div style="min-width:180px">
          <p style="font-weight:600;font-size:15px;margin:0 0 8px">${province.name}</p>
          <p style="margin:2px 0;color:#94a3b8;font-size:12px">${catLabel}: <strong style="color:#f1f5f9">${crimeCount.toLocaleString("es-CR")}</strong></p>
          <p style="margin:2px 0;color:#94a3b8;font-size:12px">Tasa: <strong style="color:#f1f5f9">${province.rate} / 100k hab.</strong></p>
          <p style="margin:2px 0;color:#94a3b8;font-size:12px">Variación: <strong style="${province.trend > 0 ? "color:#f87171" : "color:#4ade80"}">${province.trend > 0 ? "+" : ""}${province.trend}%</strong></p>
        </div>
      `);

      polygon.on("click", () => setSelected(province));
      polygon.on("mouseover", () => polygon.setStyle({ weight: 3 }));
      polygon.on("mouseout", () => polygon.setStyle({ weight: 1.5 }));

      polygon.addTo(map);
      polygonsRef.current.push(polygon);
    });
  }, [L, selectedCategory]);

  const catInfo = CATEGORIES.find((c) => c.key === selectedCategory);

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />

      {/* Legend */}
      <div className="absolute bottom-6 left-4 z-[1000] bg-slate-900/90 border border-slate-700 rounded-lg p-3 text-xs space-y-1.5">
        <p className="text-slate-400 font-medium mb-2">Tasa por 100k hab.</p>
        {[
          { label: "> 55", color: "#ef4444" },
          { label: "45 – 55", color: "#f97316" },
          { label: "35 – 45", color: "#eab308" },
          { label: "< 35", color: "#22c55e" },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: l.color }} />
            <span className="text-slate-300">{l.label}</span>
          </div>
        ))}
      </div>

      {/* Category pill */}
      <div
        className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] px-3 py-1.5 rounded-full text-xs font-medium border"
        style={{ borderColor: catInfo?.color, color: catInfo?.color, background: "rgba(15,23,42,0.9)" }}
      >
        {catInfo?.label}
      </div>

      {/* Selected province panel */}
      {selected && (
        <div className="absolute top-4 right-4 z-[1000] w-56 bg-slate-900/95 border border-slate-700 rounded-xl p-4 text-sm shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-white">{selected.name}</p>
            <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-slate-300 text-lg leading-none">×</button>
          </div>
          <div className="space-y-1.5 text-xs">
            {CATEGORIES.map((cat) => (
              <div key={cat.key} className="flex justify-between">
                <span className="text-slate-400">{cat.label}</span>
                <span className="text-slate-200 font-medium">{selected.crimes[cat.key].toLocaleString("es-CR")}</span>
              </div>
            ))}
            <div className="border-t border-slate-700 pt-1.5 mt-1.5 flex justify-between">
              <span className="text-slate-400">Tasa / 100k</span>
              <span className="text-orange-400 font-semibold">{selected.rate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Variación</span>
              <span className={selected.trend > 0 ? "text-red-400" : "text-emerald-400"}>
                {selected.trend > 0 ? "+" : ""}{selected.trend}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
