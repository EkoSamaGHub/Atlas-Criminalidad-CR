"use client";
import { useEffect, useRef, useState } from "react";
import type { ProvinceData, CrimeCategory } from "@/lib/categories";
import { CATEGORIES } from "@/lib/categories";

// Province centroids for map centering
const PROVINCE_CENTROIDS: Record<string, [number, number]> = {
  "San José":   [9.93, -84.09],
  Alajuela:     [10.20, -84.43],
  Cartago:      [9.87, -83.92],
  Heredia:      [10.15, -84.10],
  Guanacaste:   [10.55, -85.45],
  Puntarenas:   [9.65, -84.85],
  Limón:        [9.90, -83.03],
};

function getIntensityColor(ratio: number): string {
  // ratio 0–1: green → yellow → orange → red
  if (ratio > 0.8)  return "#ef4444"; // red-500
  if (ratio > 0.6)  return "#f97316"; // orange-500
  if (ratio > 0.4)  return "#eab308"; // yellow-500
  if (ratio > 0.2)  return "#22d3ee"; // cyan-400
  return "#22c55e";                    // green-500
}

interface GeoJSONFeature {
  type: "Feature";
  properties: { name: string; code: string; capital?: string };
  geometry: { type: string; coordinates: number[][][] | number[][][][] };
}

interface Props {
  selectedCategory: CrimeCategory;
  provinces: ProvinceData[];
}

export default function CrimeMap({ selectedCategory, provinces }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.Layer[]>([]);
  const [selected, setSelected] = useState<ProvinceData | null>(null);
  const [L, setL] = useState<typeof import("leaflet") | null>(null);
  const [geojson, setGeojson] = useState<GeoJSONFeature[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load Leaflet + GeoJSON in parallel
  useEffect(() => {
    Promise.all([
      import("leaflet"),
      fetch("/data/cr-provinces.geojson").then((r) => {
        if (!r.ok) throw new Error(`No se pudo cargar el mapa (${r.status})`);
        return r.json();
      }),
    ]).then(([leaflet, geo]) => {
      setL(leaflet);
      setGeojson(geo.features as GeoJSONFeature[]);
    }).catch((err: unknown) => {
      setLoadError(err instanceof Error ? err.message : "Error desconocido al cargar el mapa");
    });
  }, []);

  // Init map
  useEffect(() => {
    if (!L || !mapRef.current || leafletMapRef.current) return;

    const map = L.map(mapRef.current, {
      center: [9.97, -84.2],
      zoom: 7,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://openstreetmap.org">OSM</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    leafletMapRef.current = map;
    return () => { map.remove(); leafletMapRef.current = null; };
  }, [L]);

  // Draw choropleth when data/category changes
  useEffect(() => {
    if (!L || !leafletMapRef.current || !geojson || !provinces.length) return;
    const map = leafletMapRef.current;

    // Clear previous layers
    layersRef.current.forEach((l) => l.remove());
    layersRef.current = [];

    const values = provinces.map((p) => p.crimes[selectedCategory] ?? 0);
    const maxVal = Math.max(...values, 1);

    geojson.forEach((feature) => {
      const provName = feature.properties.name;
      const prov = provinces.find((p) => p.name === provName);
      if (!prov) return;

      const val   = prov.crimes[selectedCategory] ?? 0;
      const ratio = val / maxVal;
      const color = getIntensityColor(ratio);
      const fillOpacity = 0.15 + ratio * 0.6;

      const toLatLng = (rings: number[][][]): L.LatLngExpression[][] =>
        rings.map((ring) => ring.map(([lng, lat]) => [lat, lng] as [number, number]));

      let layer: L.Layer;
      if (feature.geometry.type === "MultiPolygon") {
        const polys = (feature.geometry.coordinates as number[][][][]).map(toLatLng);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        layer = L.polygon(polys as any, {
          color, fillColor: color, fillOpacity, weight: 2, opacity: 0.9,
        });
      } else {
        const rings = toLatLng(feature.geometry.coordinates as number[][][]);
        layer = L.polygon(rings, {
          color, fillColor: color, fillOpacity, weight: 2, opacity: 0.9,
        });
      }

      const catLabel = CATEGORIES.find((c) => c.key === selectedCategory)?.label ?? selectedCategory;
      const popHtml = `
        <div style="min-width:200px;font-family:system-ui">
          <p style="font-weight:700;font-size:15px;margin:0 0 8px 0;color:#fff">${provName}</p>
          <p style="margin:3px 0;color:#94a3b8;font-size:12px">${catLabel}:
            <strong style="color:#f1f5f9">${val.toLocaleString("es-CR")}</strong></p>
          <p style="margin:3px 0;color:#94a3b8;font-size:12px">Tasa /100k:
            <strong style="color:#fb923c">${prov.rate}</strong></p>
          <p style="margin:3px 0;color:#94a3b8;font-size:12px">Variación:
            <strong style="${prov.trend > 0 ? "color:#f87171" : prov.trend < 0 ? "color:#4ade80" : "color:#94a3b8"}">${prov.trend > 0 ? "+" : ""}${prov.trend}%</strong></p>
          <p style="margin:3px 0;color:#94a3b8;font-size:12px">Capital: <span style="color:#cbd5e1">${feature.properties.capital ?? ""}</span></p>
        </div>`;

      (layer as L.Polygon).bindPopup(popHtml);
      (layer as L.Polygon).on("click", () => {
        setSelected(prov);
        const cent = PROVINCE_CENTROIDS[provName];
        if (cent) map.setView(cent, 9, { animate: true });
      });
      (layer as L.Polygon).on("mouseover", () => (layer as L.Polygon).setStyle({ weight: 3.5 }));
      (layer as L.Polygon).on("mouseout",  () => (layer as L.Polygon).setStyle({ weight: 2 }));

      layer.addTo(map);
      layersRef.current.push(layer);
    });
  }, [L, geojson, provinces, selectedCategory]);

  const catInfo = CATEGORIES.find((c) => c.key === selectedCategory);

  if (loadError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-950">
        <div className="text-center space-y-2 px-6 max-w-sm">
          <p className="text-red-400 font-semibold text-sm">No se pudo cargar el mapa</p>
          <p className="text-slate-500 text-xs">{loadError}</p>
          <p className="text-slate-600 text-xs">Intenta recargar la página. Los datos provinciales siguen disponibles en el panel lateral.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />

      {/* Legend */}
      <div className="absolute bottom-6 left-4 z-[1000] bg-slate-900/90 backdrop-blur border border-slate-700 rounded-lg p-3 text-xs space-y-1.5 shadow-lg">
        <p className="text-slate-300 font-semibold mb-2">Intensidad relativa</p>
        {[
          { label: "Muy alta", color: "#ef4444" },
          { label: "Alta",     color: "#f97316" },
          { label: "Media",    color: "#eab308" },
          { label: "Baja",     color: "#22d3ee" },
          { label: "Muy baja", color: "#22c55e" },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: l.color }} />
            <span className="text-slate-300">{l.label}</span>
          </div>
        ))}
        <p className="text-slate-600 text-[10px] pt-1 border-t border-slate-800">
          Escala relativa al máximo<br />provincial para la categoría
        </p>
      </div>

      {/* Category pill */}
      <div
        className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] px-3 py-1.5 rounded-full text-xs font-semibold border shadow-lg"
        style={{
          borderColor: catInfo?.color ?? "#64748b",
          color: catInfo?.color ?? "#94a3b8",
          background: "rgba(15,23,42,0.92)"
        }}
      >
        {catInfo?.label ?? selectedCategory}
      </div>

      {/* Selected province panel */}
      {selected && (
        <div className="absolute top-4 right-4 z-[1000] w-60 bg-slate-900/95 backdrop-blur border border-slate-700 rounded-xl p-4 text-sm shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold text-white">{selected.name}</p>
            <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-slate-200 text-xl leading-none px-1">×</button>
          </div>
          <div className="space-y-1.5 text-xs">
            {CATEGORIES.map((cat) => (
              <div key={cat.key} className="flex justify-between items-center">
                <span className="text-slate-400">{cat.label}</span>
                <span className="font-semibold" style={{ color: cat.color }}>
                  {(selected.crimes[cat.key] ?? 0).toLocaleString("es-CR")}
                </span>
              </div>
            ))}
            <div className="border-t border-slate-700 pt-2 mt-2 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Tasa / 100k hab.</span>
                <span className="text-orange-400 font-bold">{selected.rate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Variación anual</span>
                <span className={selected.trend > 0 ? "text-red-400 font-semibold" : selected.trend < 0 ? "text-emerald-400 font-semibold" : "text-slate-500"}>
                  {selected.trend !== 0 ? `${selected.trend > 0 ? "+" : ""}${selected.trend}%` : "sin cambio"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Población</span>
                <span className="text-slate-300">{selected.population.toLocaleString("es-CR")}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
