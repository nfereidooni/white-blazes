/**
 * Read a Strava bulk export (the "Download your data" zip) in the browser.
 *
 * The zip holds activities.csv (id, date, name, type, filename for every
 * activity) and an activities/ folder of track files. Only hikes and walks
 * with a GPX track near the Bruce Trail are returned; nothing is uploaded.
 */
import JSZip from "jszip";
import { parseGpx, type ParsedTrack } from "./gpx";

export type StravaActivity = {
  activityId: string;
  name: string;
  type: string;
  date: string | null;
  track: ParsedTrack;
};

export type ArchiveResult = {
  activities: StravaActivity[];
  /** Hikes and walks recorded as .fit or .tcx, which can't be read yet. */
  unreadable: number;
  /** Hikes and walks nowhere near the trail. */
  elsewhere: number;
};

const TYPES = /hike|walk/i;

// A box around the whole Bruce Trail, Queenston to Tobermory, with ~5 km to
// spare. A track with no points inside can't be on the trail.
const BOX = { minLat: 43.1, maxLat: 45.3, minLon: -81.75, maxLon: -78.95 };
const inBox = (la: number, lo: number) => la >= BOX.minLat && la <= BOX.maxLat && lo >= BOX.minLon && lo <= BOX.maxLon;

export async function readStravaArchive(file: File, onProgress?: (done: number, total: number) => void): Promise<ArchiveResult> {
  const zip = await JSZip.loadAsync(file);
  const csv = zip.file(/(^|\/)activities\.csv$/)[0];
  if (!csv) throw new Error("This doesn't look like a Strava export: there's no activities.csv inside.");

  const rows = parseCsv(await csv.async("string"));
  const head = rows[0] ?? [];
  const col = (n: string) => head.indexOf(n);
  const cId = col("Activity ID"), cDate = col("Activity Date"), cName = col("Activity Name"), cType = col("Activity Type"), cFile = col("Filename");
  if (cId < 0 || cFile < 0) throw new Error("activities.csv is missing the columns we need.");

  const wanted = rows.slice(1).filter((r) => r[cFile] && TYPES.test(r[cType] ?? ""));
  const result: ArchiveResult = { activities: [], unreadable: 0, elsewhere: 0 };

  for (let i = 0; i < wanted.length; i++) {
    onProgress?.(i, wanted.length);
    const r = wanted[i];
    const path = r[cFile];
    if (!/\.gpx(\.gz)?$/i.test(path)) {
      result.unreadable++;
      continue;
    }
    const entry = zip.file(path) ?? zip.file(new RegExp(`(^|/)${escapeRe(path.split("/").pop()!)}$`))[0];
    if (!entry) continue;

    const text = path.endsWith(".gz") ? await gunzip(await entry.async("uint8array")) : await entry.async("string");
    let track: ParsedTrack;
    try {
      track = await parseGpx(text);
    } catch {
      continue;
    }
    if (!track.lats.some((la, k) => inBox(la, track.lons[k]))) {
      result.elsewhere++;
      continue;
    }
    result.activities.push({
      activityId: r[cId],
      name: r[cName] || track.name || "Strava activity",
      type: r[cType],
      // The track's own timestamps give the local date; the CSV date is UTC.
      date: track.date ?? stravaDate(r[cDate]),
      track,
    });
  }
  onProgress?.(wanted.length, wanted.length);
  result.activities.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  return result;
}

async function gunzip(bytes: Uint8Array) {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream("gzip"));
  return await new Response(stream).text();
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const MONTHS: Record<string, string> = { Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06", Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12" };
function stravaDate(s: string | undefined) {
  const m = /([A-Z][a-z]{2}) (\d{1,2}), (\d{4})/.exec(s ?? "");
  return m ? `${m[3]}-${MONTHS[m[1]]}-${m[2].padStart(2, "0")}` : null;
}

/** A small CSV reader that handles quoted fields with commas and line breaks. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], f = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') { f += '"'; i++; } else q = false;
      } else f += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(f); rows.push(row); row = []; f = "";
    } else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows;
}
