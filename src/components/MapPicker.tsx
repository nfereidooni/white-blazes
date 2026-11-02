"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import type { GeoJSONSource, Map as MlMap, Marker } from "maplibre-gl";
import { snapPoint } from "@/app/hikes/actions";

type Snapped = { sectionId: number; km: number; lat: number; lon: number };
type SectionInfo = { id: number; name: string; lengthKm: number; bounds: [[number, number], [number, number]] };
type Feature = {
  properties: { section_id: number; name: string; length_km: number };
  geometry: { coordinates: [number, number][] };
};

// Free map imagery from OpenFreeMap (OpenStreetMap data, no account or key).
const STYLE = "https://tiles.openfreemap.org/styles/liberty";
const WHOLE_TRAIL: [[number, number], [number, number]] = [
  [-81.75, 43.1],
  [-78.95, 45.3],
];
const EMPTY = { type: "FeatureCollection" as const, features: [] };

/**
 * Pick a section to zoom in, then tap where you started and where you
 * finished. Taps snap to the trail; the stretch between them is drawn, and
 * it can run across section boundaries. The two points go into hidden
 * coords_start / coords_end inputs, the same fields as the Coordinates option.
 */
export function MapPicker({ initialSectionId }: { initialSectionId: number | null }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const markers = useRef<Marker[]>([]);
  const ml = useRef<typeof import("maplibre-gl") | null>(null);
  const [sections, setSections] = useState<SectionInfo[]>([]);
  const [active, setActive] = useState<number | null>(initialSectionId);
  const [points, setPoints] = useState<Snapped[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pointsRef = useRef<Snapped[]>([]);
  pointsRef.current = points;
  const sectionsRef = useRef<SectionInfo[]>([]);
  // Each section's line, south to north, for drawing the picked stretch.
  const lines = useRef<Map<number, [number, number][]>>(new Map());
  sectionsRef.current = sections;

  // Build the map once. maplibre-gl is loaded only here, so other pages don't download it.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const lib = await import("maplibre-gl");
      ml.current = lib;
      if (cancelled || !box.current) return;
      const m = new lib.Map({ container: box.current, style: STYLE, bounds: WHOLE_TRAIL, attributionControl: { compact: true } });
      m.addControl(new lib.NavigationControl({ showCompass: false }), "top-right");
      map.current = m;

      m.on("load", async () => {
        const data = await (await fetch("/api/trail")).json();
        const info: SectionInfo[] = (data.features as Feature[]).map((f) => {
          const xs = f.geometry.coordinates.map((c) => c[0]);
          const ys = f.geometry.coordinates.map((c) => c[1]);
          return {
            id: f.properties.section_id,
            name: f.properties.name,
            lengthKm: Number(f.properties.length_km),
            bounds: [
              [Math.min(...xs), Math.min(...ys)],
              [Math.max(...xs), Math.max(...ys)],
            ],
          };
        });
        setSections(info);
        lines.current = new Map((data.features as Feature[]).map((f) => [f.properties.section_id, f.geometry.coordinates]));
        m.addSource("trail", { type: "geojson", data });
        m.addSource("picked", { type: "geojson", data: EMPTY });
        m.addLayer({ id: "trail-casing", type: "line", source: "trail", paint: { "line-color": "#13251a", "line-width": 6 } });
        m.addLayer({ id: "trail", type: "line", source: "trail", paint: { "line-color": "#f7f5ee", "line-width": 3 } });
        m.addLayer({
          id: "picked",
          type: "line",
          source: "picked",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": "#c85f1e", "line-width": 6 },
        });
        highlight(initialSectionId);
        if (initialSectionId) fit(info.find((s) => s.id === initialSectionId)?.bounds, false);
      });

      // Only a click on (or right beside) the trail places a point, and the
      // cursor says so: a crosshair over the trail, the usual grab hand
      // everywhere else so people can drag the map around.
      const nearTrail = (pt: { x: number; y: number }) =>
        m.getLayer("trail") &&
        m.queryRenderedFeatures(
          [
            [pt.x - 14, pt.y - 14],
            [pt.x + 14, pt.y + 14],
          ],
          { layers: ["trail", "trail-casing"] },
        ).length > 0;
      m.on("mousemove", (e) => {
        m.getCanvas().style.cursor = nearTrail(e.point) ? "crosshair" : "";
      });
      m.on("click", (e) => {
        if (nearTrail(e.point)) onTap(e.lngLat.lat, e.lngLat.lng);
        else setMessage("Click on the white trail line to place a point. Drag to move the map.");
      });
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function fit(bounds: SectionInfo["bounds"] | undefined, animate = true) {
    if (bounds) map.current?.fitBounds(bounds, { padding: 24, maxZoom: 14, duration: animate ? 700 : 0 });
  }

  // The chosen section is drawn bold; the others fade back.
  function highlight(id: number | null) {
    const m = map.current;
    if (!m?.getLayer("trail")) return;
    const isActive: unknown = id ? ["==", ["get", "section_id"], id] : true;
    m.setPaintProperty("trail", "line-width", ["case", isActive, 4, 2]);
    m.setPaintProperty("trail", "line-opacity", ["case", isActive, 1, 0.55]);
    m.setPaintProperty("trail-casing", "line-width", ["case", isActive, 8, 4]);
    m.setPaintProperty("trail-casing", "line-opacity", ["case", isActive, 1, 0.4]);
  }

  function chooseSection(id: number) {
    setActive(id);
    highlight(id);
    fit(sections.find((s) => s.id === id)?.bounds);
  }

  function reset() {
    markers.current.forEach((mk) => mk.remove());
    markers.current = [];
    (map.current?.getSource("picked") as GeoJSONSource | undefined)?.setData(EMPTY);
    setPoints([]);
    setMessage(null);
  }

  async function onTap(lat: number, lon: number) {
    const m = map.current;
    const lib = ml.current;
    if (!m || !lib) return;
    setMessage(null);
    setBusy(true);
    const res = await snapPoint(lat, lon);
    setBusy(false);
    if ("error" in res) return setMessage(res.error ?? "Couldn't find the trail there.");

    const start = pointsRef.current.length >= 2 ? [] : pointsRef.current;
    if (!start.length) reset();
    const next = [...start, res];
    setPoints(next);
    if (next.length === 1) {
      setActive(res.sectionId);
      highlight(res.sectionId);
    }

    const el = document.createElement("div");
    el.className = `map-pin ${next.length === 1 ? "map-pin-start" : "map-pin-end"}`;
    el.setAttribute("aria-label", next.length === 1 ? "Start" : "Finish");
    markers.current.push(new lib.Marker({ element: el }).setLngLat([res.lon, res.lat]).addTo(m));

    if (next.length === 2) {
      // Draw the stretch right here in the browser: cut each section's line
      // between the two snapped points, and include any sections in between.
      (m.getSource("picked") as GeoJSONSource | undefined)?.setData(stretchGeoJson(next[0], next[1], lines.current));
    }
  }

  const [a, b] = points;
  const step = !a ? "1 · Tap the trail where you started" : !b ? "2 · Now tap where you finished" : null;

  return (
    <div className="map-picker">
      {sections.length > 0 && (
        <div className="section-chips" role="group" aria-label="Zoom to a section">
          <span className="chips-label" aria-hidden="true">Zoom to</span>
          {sections.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`chip${active === s.id ? " chip-on" : ""}`}
              aria-pressed={active === s.id}
              onClick={() => chooseSection(s.id)}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      <div className="map-wrap">
        <div ref={box} className="map-box" role="application" aria-label="Map of the Bruce Trail. Tap where you started and where you finished." />
        <div className="map-step" aria-live="polite">
          {step ? (
            <span>{busy ? "Finding the trail…" : step}</span>
          ) : (
            <>
              <span className="map-km">{totalKm(a, b, sections).toFixed(1)} km</span>
              <button type="button" onClick={reset}>
                Start over
              </button>
            </>
          )}
        </div>
        {!active && !a && <p className="map-tip">Pick a section above to zoom in.</p>}
      </div>

      {message && (
        <p className="error" role="alert">
          {message}
        </p>
      )}
      {a && b && (
        <div className="found" role="status">
          <p className="found-head">
            <span>Your stretch</span>
            <span className="mono">{totalKm(a, b, sections).toFixed(1)} km of trail</span>
          </p>
          <ul className="found-list">
            {describe(a, b, sections).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <dl className="coords">
            <dt>Start</dt>
            <dd className="mono">{fmtLatLon(a)}</dd>
            <dt>Finish</dt>
            <dd className="mono">{fmtLatLon(b)}</dd>
          </dl>
        </div>
      )}

      <input type="hidden" name="coords_start" value={a ? `${a.lat}, ${a.lon}` : ""} />
      <input type="hidden" name="coords_end" value={b ? `${b.lat}, ${b.lon}` : ""} />
    </div>
  );
}

/** One line per section the stretch passes through, south to north. */
function pieces(a: Snapped, b: Snapped, sections: SectionInfo[]) {
  const [p, q] = a.sectionId < b.sectionId || (a.sectionId === b.sectionId && a.km <= b.km) ? [a, b] : [b, a];
  const out: { name: string; from: number; to: number }[] = [];
  for (let id = p.sectionId; id <= q.sectionId; id++) {
    const s = sections.find((x) => x.id === id);
    out.push({
      name: s?.name ?? `Section ${id}`,
      from: id === p.sectionId ? p.km : 0,
      to: id === q.sectionId ? q.km : (s?.lengthKm ?? 0),
    });
  }
  return out;
}

function describe(a: Snapped, b: Snapped, sections: SectionInfo[]) {
  return pieces(a, b, sections).map((x) => `${x.name} km ${x.from.toFixed(1)} to ${x.to.toFixed(1)}`);
}

function totalKm(a: Snapped, b: Snapped, sections: SectionInfo[]) {
  return pieces(a, b, sections).reduce((t, x) => t + (x.to - x.from), 0);
}

/** The trail between two snapped points as a MultiLineString, one line per section. */
function stretchGeoJson(a: Snapped, b: Snapped, lines: Map<number, [number, number][]>) {
  const [p, q] = a.sectionId < b.sectionId || (a.sectionId === b.sectionId && a.km <= b.km) ? [a, b] : [b, a];
  const nearest = (coords: [number, number][], pt: Snapped) => {
    let best = 0;
    let bd = Infinity;
    coords.forEach(([x, y], i) => {
      const d = (x - pt.lon) ** 2 + (y - pt.lat) ** 2;
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    return best;
  };
  const parts: [number, number][][] = [];
  for (let id = p.sectionId; id <= q.sectionId; id++) {
    const coords = lines.get(id) ?? [];
    let from = id === p.sectionId ? nearest(coords, p) : 0;
    let to = id === q.sectionId ? nearest(coords, q) : coords.length - 1;
    if (from > to) [from, to] = [to, from];
    const piece = coords.slice(from, to + 1);
    if (id === p.sectionId) piece.unshift([p.lon, p.lat]);
    if (id === q.sectionId) piece.push([q.lon, q.lat]);
    if (piece.length > 1) parts.push(piece);
  }
  return { type: "Feature" as const, properties: {}, geometry: { type: "MultiLineString" as const, coordinates: parts } };
}

const fmtLatLon = (p: Snapped) => `${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}`;
