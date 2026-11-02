/**
 * Small geometry helpers for drawing on the map in the browser.
 *
 * A km position on a section is a fraction along its line (km / official
 * length), the same rule the database uses. Here we cut the section's line
 * at those fractions, measuring along it with the haversine formula.
 */
export type LngLat = [number, number];

const R = 6371000;
const rad = (d: number) => (d * Math.PI) / 180;

function dist([lon1, lat1]: LngLat, [lon2, lat2]: LngLat) {
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Distance from the start of the line to each point, in metres. */
export function cumulative(coords: LngLat[]) {
  const out = [0];
  for (let i = 1; i < coords.length; i++) out.push(out[i - 1] + dist(coords[i - 1], coords[i]));
  return out;
}

function pointAt(coords: LngLat[], cum: number[], d: number): LngLat {
  let i = 1;
  while (i < cum.length - 1 && cum[i] < d) i++;
  const seg = cum[i] - cum[i - 1] || 1;
  const t = Math.max(0, Math.min(1, (d - cum[i - 1]) / seg));
  return [coords[i - 1][0] + (coords[i][0] - coords[i - 1][0]) * t, coords[i - 1][1] + (coords[i][1] - coords[i - 1][1]) * t];
}

/** The part of a line between two fractions (0 to 1) of its length. */
export function slice(coords: LngLat[], cum: number[], from: number, to: number): LngLat[] {
  const total = cum[cum.length - 1];
  const a = Math.max(0, Math.min(1, from)) * total;
  const b = Math.max(0, Math.min(1, to)) * total;
  if (b <= a) return [];
  const out: LngLat[] = [pointAt(coords, cum, a)];
  for (let i = 0; i < coords.length; i++) if (cum[i] > a && cum[i] < b) out.push(coords[i]);
  out.push(pointAt(coords, cum, b));
  return out;
}

export function bounds(coords: LngLat[]): [LngLat, LngLat] {
  const xs = coords.map((c) => c[0]);
  const ys = coords.map((c) => c[1]);
  return [
    [Math.min(...xs), Math.min(...ys)],
    [Math.max(...xs), Math.max(...ys)],
  ];
}
