"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Map as MlMap } from "maplibre-gl";
import { bounds, cumulative, slice, type LngLat } from "@/lib/trailGeo";

export type MapSection = { id: number; slug: string; lengthKm: number; covered: [number, number][] };
type Feature = { properties: { section_id: number }; geometry: { coordinates: LngLat[] } };

const STYLE = "https://tiles.openfreemap.org/styles/liberty";
const WHOLE_TRAIL: [LngLat, LngLat] = [
  [-81.75, 43.1],
  [-78.95, 45.3],
];

const lineFeature = (coords: LngLat[], props: Record<string, unknown> = {}) => ({
  type: "Feature" as const,
  properties: props,
  geometry: { type: "LineString" as const, coordinates: coords },
});

/**
 * The whole trail with the stretches you've hiked drawn over it. Tap a
 * section to open it in the side panel; the chosen section is outlined.
 * Everything is drawn in the browser from the trail line and your km
 * ranges, so no geometry is stored per person.
 */
export function TrailMap({
  sections,
  selectedId,
  gap,
}: {
  sections: MapSection[];
  selectedId: number | null;
  gap: { sectionId: number; from: number; to: number } | null;
}) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const boundsBySection = useRef<Map<number, [LngLat, LngLat]>>(new Map());
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const slugById = useRef(new Map(sections.map((s) => [s.id, s.slug])));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const lib = await import("maplibre-gl");
      if (cancelled || !box.current) return;
      const m = new lib.Map({ container: box.current, style: STYLE, bounds: WHOLE_TRAIL, attributionControl: { compact: true } });
      m.addControl(new lib.NavigationControl({ showCompass: false }), "top-right");
      map.current = m;

      m.on("load", async () => {
        const data = await (await fetch("/api/trail")).json();
        const features = data.features as Feature[];
        const hiked: ReturnType<typeof lineFeature>[] = [];
        let gapLine: ReturnType<typeof lineFeature> | null = null;

        for (const f of features) {
          const id = f.properties.section_id;
          const coords = f.geometry.coordinates;
          boundsBySection.current.set(id, bounds(coords));
          const s = sections.find((x) => x.id === id);
          if (!s) continue;
          const cum = cumulative(coords);
          for (const [a, b] of s.covered) hiked.push(lineFeature(slice(coords, cum, a / s.lengthKm, b / s.lengthKm)));
          if (gap && gap.sectionId === id) gapLine = lineFeature(slice(coords, cum, gap.from / s.lengthKm, gap.to / s.lengthKm));
        }

        m.addSource("trail", { type: "geojson", data });
        m.addSource("hiked", { type: "geojson", data: { type: "FeatureCollection", features: hiked } });
        m.addSource("gap", { type: "geojson", data: { type: "FeatureCollection", features: gapLine ? [gapLine] : [] } });

        m.addLayer({
          id: "selected-glow",
          type: "line",
          source: "trail",
          filter: ["==", ["get", "section_id"], -1],
          paint: { "line-color": "#e8b46a", "line-width": 14, "line-opacity": 0.55 },
          layout: { "line-cap": "round", "line-join": "round" },
        });
        m.addLayer({ id: "trail-casing", type: "line", source: "trail", paint: { "line-color": "#13251a", "line-width": 6 }, layout: { "line-join": "round" } });
        m.addLayer({ id: "trail", type: "line", source: "trail", paint: { "line-color": "#f7f5ee", "line-width": 3 }, layout: { "line-join": "round" } });
        m.addLayer({ id: "gap", type: "line", source: "gap", paint: { "line-color": "#d9772b", "line-width": 5 }, layout: { "line-cap": "round" } });
        m.addLayer({ id: "hiked", type: "line", source: "hiked", paint: { "line-color": "#24452f", "line-width": 5 }, layout: { "line-cap": "round", "line-join": "round" } });
        // A wide invisible line makes the trail easy to tap.
        m.addLayer({ id: "trail-hit", type: "line", source: "trail", paint: { "line-color": "#000", "line-width": 18, "line-opacity": 0 } });

        m.on("mouseenter", "trail-hit", () => (m.getCanvas().style.cursor = "pointer"));
        m.on("mouseleave", "trail-hit", () => (m.getCanvas().style.cursor = ""));
        m.on("click", "trail-hit", (e) => {
          const id = e.features?.[0]?.properties?.section_id as number | undefined;
          const slug = id != null ? slugById.current.get(id) : undefined;
          if (slug) router.push(`/map?s=${slug}`, { scroll: false });
        });
        if (!cancelled) setReady(true);
      });
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
    // The map is built once; later changes arrive through the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Outline and zoom to the chosen section whenever it changes.
  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    m.setFilter("selected-glow", ["==", ["get", "section_id"], selectedId ?? -1]);
    const b = selectedId != null ? boundsBySection.current.get(selectedId) : undefined;
    m.fitBounds(b ?? WHOLE_TRAIL, { padding: 40, duration: 600 });
  }, [ready, selectedId]);

  return (
    <div className="trail-map">
      <div ref={box} className="map-box map-box-tall" aria-label="Map of the Bruce Trail with the stretches you've hiked" role="region" />
      {!ready && <p className="map-loading-note">Loading the map…</p>}
      <button type="button" className="map-whole secondary" onClick={() => map.current?.fitBounds(WHOLE_TRAIL, { padding: 20, duration: 600 })}>
        Whole trail
      </button>
    </div>
  );
}
