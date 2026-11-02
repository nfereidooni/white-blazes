"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import type { Map as MlMap, Marker } from "maplibre-gl";
import { snapPoint } from "@/app/hikes/actions";

type Snapped = { sectionId: number; km: number; lat: number; lon: number };
type Feature = { properties: { section_id: number; name: string }; geometry: { coordinates: [number, number][] } };

// Free map imagery from OpenFreeMap (OpenStreetMap data, no account or key).
const STYLE = "https://tiles.openfreemap.org/styles/liberty";

/**
 * Tap where you started, then where you finished. Each tap snaps to the
 * trail line, and the two points are written into hidden coords_start and
 * coords_end inputs, the same fields the Coordinates option uses.
 */
export function MapPicker({ sectionId }: { sectionId: number | null }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const markers = useRef<Marker[]>([]);
  const features = useRef<Feature[]>([]);
  const [points, setPoints] = useState<Snapped[]>([]);
  const [names, setNames] = useState<Map<number, string>>(new Map());
  const [message, setMessage] = useState<string | null>(null);
  const pointsRef = useRef<Snapped[]>([]);
  pointsRef.current = points;

  // Build the map once. maplibre-gl is loaded only here, so other pages don't download it.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ml = (await import("maplibre-gl")).default;
      if (cancelled || !box.current) return;
      const m = new ml.Map({
        container: box.current,
        style: STYLE,
        bounds: [
          [-81.75, 43.1],
          [-78.95, 45.3],
        ],
        attributionControl: { compact: true },
      });
      m.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");
      map.current = m;

      m.on("load", async () => {
        const res = await fetch("/api/trail");
        const data = await res.json();
        features.current = data.features ?? [];
        setNames(new Map(features.current.map((f) => [f.properties.section_id, f.properties.name])));
        m.addSource("trail", { type: "geojson", data });
        m.addLayer({ id: "trail-casing", type: "line", source: "trail", paint: { "line-color": "#13251a", "line-width": 6 } });
        m.addLayer({ id: "trail", type: "line", source: "trail", paint: { "line-color": "#f7f5ee", "line-width": 3 } });
        zoomTo(sectionId);
      });

      m.on("click", async (e) => {
        setMessage(null);
        const res = await snapPoint(e.lngLat.lat, e.lngLat.lng);
        if ("error" in res) return setMessage(res.error ?? "Couldn't find the trail there.");
        const next = pointsRef.current.length >= 2 ? [res] : [...pointsRef.current, res];
        markers.current.forEach((mk) => mk.remove());
        markers.current = next.map((p, i) => {
          const el = document.createElement("div");
          el.className = `map-pin ${i === 0 ? "map-pin-start" : "map-pin-end"}`;
          el.setAttribute("aria-label", i === 0 ? "Start" : "End");
          return new ml.Marker({ element: el }).setLngLat([p.lon, p.lat]).addTo(m);
        });
        setPoints(next);
      });
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Follow the section picked in the form.
  useEffect(() => zoomTo(sectionId), [sectionId]);

  function zoomTo(id: number | null) {
    const m = map.current;
    const f = features.current.find((x) => x.properties.section_id === id);
    if (!m || !f) return;
    const xs = f.geometry.coordinates.map((c) => c[0]);
    const ys = f.geometry.coordinates.map((c) => c[1]);
    m.fitBounds(
      [
        [Math.min(...xs), Math.min(...ys)],
        [Math.max(...xs), Math.max(...ys)],
      ],
      { padding: 30, duration: 600 },
    );
  }

  const [a, b] = points;
  const status = !a
    ? "Tap the trail where you started."
    : !b
      ? "Now tap where you finished."
      : describe(a, b, names);

  return (
    <div className="map-picker">
      <div ref={box} className="map-box" role="application" aria-label="Map of the Bruce Trail. Tap your start and end points." />
      <p className="hint" role="status">
        {status}
        {b && " Tap again to start over."}
      </p>
      {message && (
        <p className="error" role="alert">
          {message}
        </p>
      )}
      <input type="hidden" name="coords_start" value={a ? `${a.lat}, ${a.lon}` : ""} />
      <input type="hidden" name="coords_end" value={b ? `${b.lat}, ${b.lon}` : ""} />
    </div>
  );
}

function describe(a: Snapped, b: Snapped, names: Map<number, string>) {
  const [p, q] = a.sectionId < b.sectionId || (a.sectionId === b.sectionId && a.km <= b.km) ? [a, b] : [b, a];
  const name = (id: number) => names.get(id) ?? `Section ${id}`;
  return p.sectionId === q.sectionId
    ? `${name(p.sectionId)} km ${p.km.toFixed(1)} to ${q.km.toFixed(1)}.`
    : `${name(p.sectionId)} km ${p.km.toFixed(1)} to ${name(q.sectionId)} km ${q.km.toFixed(1)}.`;
}
