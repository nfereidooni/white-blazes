/**
 * Read a GPX file in the browser. The file never leaves the device: only
 * the thinned-out points, the distance and a fingerprint are sent on.
 */

export type ParsedTrack = {
  name: string | null;
  /** Local date of the first timestamped point, YYYY-MM-DD. */
  date: string | null;
  /** Points at least THIN_M apart, enough to match against the trail. */
  lats: number[];
  lons: number[];
  /** Full distance of the track, before thinning. */
  walkedKm: number;
  /** SHA-256 of the file: identical files get identical fingerprints. */
  hash: string;
};

const THIN_M = 15;
const MAX_POINTS = 20000;

const toRad = (d: number) => (d * Math.PI) / 180;
function distM(a: [number, number], b: [number, number]) {
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

export async function fingerprint(text: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function parseGpx(text: string): Promise<ParsedTrack> {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("That file isn't valid GPX.");

  // Tracks (<trkpt>) are what watches and apps record; routes (<rtept>) are planned lines.
  let nodes = Array.from(doc.getElementsByTagName("trkpt"));
  if (!nodes.length) nodes = Array.from(doc.getElementsByTagName("rtept"));
  const raw = nodes
    .map((n) => [Number(n.getAttribute("lat")), Number(n.getAttribute("lon"))] as [number, number])
    .filter(([la, lo]) => Number.isFinite(la) && Number.isFinite(lo));
  if (raw.length < 2) throw new Error("That file has no track points in it.");

  let walked = 0;
  for (let i = 1; i < raw.length; i++) {
    const d = distM(raw[i - 1], raw[i]);
    if (d < 1000) walked += d; // skip jumps from a paused recording
  }

  let step = THIN_M;
  let pts = thin(raw, step);
  while (pts.length > MAX_POINTS) pts = thin(raw, (step *= 2));

  const time = doc.getElementsByTagName("time")[0]?.textContent ?? null;
  const when = time ? new Date(time) : null;
  const date = when && !Number.isNaN(when.getTime()) ? when.toLocaleDateString("en-CA") : null;

  const name =
    doc.querySelector("trk > name")?.textContent?.trim() ||
    doc.querySelector("metadata > name")?.textContent?.trim() ||
    null;

  return {
    name,
    date,
    lats: pts.map((p) => Number(p[0].toFixed(6))),
    lons: pts.map((p) => Number(p[1].toFixed(6))),
    walkedKm: Math.round(walked / 100) / 10,
    hash: await fingerprint(text),
  };
}

function thin(pts: [number, number][], step: number) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) if (distM(out[out.length - 1], pts[i]) >= step) out.push(pts[i]);
  if (out[out.length - 1] !== pts[pts.length - 1]) out.push(pts[pts.length - 1]);
  return out;
}
