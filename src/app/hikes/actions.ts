"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type HikeFormState = { error?: string };

type Supabase = Awaited<ReturnType<typeof createClient>>;
type Segment = { section_id: number; from: number; to: number };

type HikeFields = {
  name: string;
  hiked_on: string;
  section_id: number;
  walked_km: number | null;
  is_club_hike: boolean;
  trail: "main" | "side";
  link: string | null;
  club_link: string | null;
  notes: string | null;
  hiked_with: string | null;
  hike_leader: string | null;
  start_point: string | null;
  end_point: string | null;
};

// Optional text fields and their maximum lengths (the database checks these too).
const TEXT_FIELDS = {
  notes: 2000,
  hiked_with: 200,
  hike_leader: 100,
  start_point: 120,
  end_point: 120,
} as const;

const LABELS: Record<string, string> = {
  notes: "Notes",
  hiked_with: "Hiked with",
  hike_leader: "Hike leader",
  start_point: "Start point",
  end_point: "End point",
};

// How far a pasted point may be from the trail and still count.
const MAX_OFF_TRAIL_M = 500;

const num = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
};

/** "43.2557, -79.8711" (the format Google and Apple Maps copy) → [lat, lon]. */
function parseLatLon(raw: FormDataEntryValue | null): [number, number] | null {
  const m = String(raw ?? "")
    .trim()
    .match(/^(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lon = Number(m[2]);
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return [lat, lon];
}

/**
 * A web address from the form: null when empty, undefined when it isn't a
 * valid http(s) address. "hikes.brucetrail.org/..." without https:// is fine.
 */
function parseLink(raw: FormDataEntryValue | null): string | null | undefined {
  const v = String(raw ?? "").trim();
  if (!v) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
    if (!["http:", "https:"].includes(u.protocol) || !u.hostname.includes(".")) return undefined;
    const out = u.toString();
    return out.length <= 500 ? out : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Check the form before it reaches the database. The database checks again
 * (constraints, the segment trigger, RLS), but catching mistakes here gives
 * people a readable message instead of a Postgres error.
 */
function parseHike(form: FormData): HikeFields | { error: string } {
  const name = String(form.get("name") ?? "").trim();
  const hiked_on = String(form.get("hiked_on") ?? "");
  const sectionRaw = String(form.get("section_id") ?? "");
  const walked = num(form.get("walked_km"));

  if (!name) return { error: "Give the hike a name." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(hiked_on)) return { error: "Pick the date you hiked." };
  // With the map or coordinates, the section comes from where you tapped,
  // so the form doesn't ask for it (resolvePlacement fills it in).
  const placedByPoints = ["map", "coords"].includes(String(form.get("placement"))) && form.get("trail") !== "side";
  if (!sectionRaw && !placedByPoints) return { error: "Pick the section you hiked in." };
  if (Number.isNaN(walked) || (walked !== null && walked < 0)) return { error: "Distance walked should be a number of km." };

  const text: Record<string, string | null> = {};
  for (const [key, max] of Object.entries(TEXT_FIELDS)) {
    const v = String(form.get(key) ?? "").trim();
    if (v.length > max) return { error: `${LABELS[key]} can be up to ${max} characters.` };
    text[key] = v || null;
  }
  const isClub = form.get("is_club_hike") === "on";

  const link = parseLink(form.get("link"));
  if (link === undefined) return { error: "The activity link doesn't look like a web address." };
  const clubLink = isClub ? parseLink(form.get("club_link")) : null;
  if (clubLink === undefined) return { error: "The club hike link doesn't look like a web address." };

  return {
    name,
    hiked_on,
    section_id: sectionRaw ? Number(sectionRaw) : 0, // 0 = set from the points below
    walked_km: walked,
    is_club_hike: isClub,
    trail: form.get("trail") === "side" ? "side" : "main",
    link,
    // Only club hikes have a club listing or a leader.
    club_link: clubLink,
    notes: text.notes,
    hiked_with: text.hiked_with,
    hike_leader: isClub ? text.hike_leader : null,
    start_point: text.start_point,
    end_point: text.end_point,
  };
}

/**
 * Work out which stretches of trail the hike covered, from whichever
 * placement option was picked. Returns:
 *   "keep"     leave the hike's current segments alone
 *   Segment[]  replace them (an empty list means "not placed")
 */
async function resolvePlacement(
  supabase: Supabase,
  form: FormData,
  hike: HikeFields,
): Promise<"keep" | Segment[] | { error: string }> {
  const placement = String(form.get("placement") ?? "skip");
  if (hike.trail === "side") return []; // side trails never count toward main trail km
  if (placement === "keep") return "keep";

  if (placement === "km") {
    const from = num(form.get("km_from"));
    const to = num(form.get("km_to"));
    if (from === null || to === null || Number.isNaN(from) || Number.isNaN(to)) {
      return { error: "Fill in both ends of the km range." };
    }
    if (from < 0 || to <= from) return { error: "The km range should go from a smaller number to a bigger one." };
    return [{ section_id: hike.section_id, from, to }];
  }

  // The map picker fills in the same two fields as pasted coordinates.
  if (placement === "coords" || placement === "map") {
    const start = parseLatLon(form.get("coords_start"));
    const end = parseLatLon(form.get("coords_end"));
    if (!start || !end) {
      return placement === "map"
        ? { error: "Tap where you started and where you finished on the map." }
        : { error: "Paste each point as latitude, longitude, for example 43.2557, -79.8711." };
    }

    // Ask Postgres where each point falls on the trail (PostGIS does the maths).
    const [a, b] = await Promise.all(
      [start, end].map((p) => supabase.rpc("locate_on_trail", { lat: p[0], lon: p[1] }).single()),
    );
    if (a.error || b.error || !a.data || !b.data) return { error: "Couldn't find those points on the trail." };
    type Loc = { section_id: number; km: number; distance_m: number };
    let [p, q] = [a.data as Loc, b.data as Loc];

    for (const [label, loc] of [["start", p], ["end", q]] as const) {
      if (Number(loc.distance_m) > MAX_OFF_TRAIL_M) {
        return {
          error: `The ${label} point is ${(Number(loc.distance_m) / 1000).toFixed(1)} km from the Bruce Trail. Check that it's on the main trail.`,
        };
      }
    }

    // Hiked north to south? Same stretch either way, so put the southern point first.
    if (q.section_id < p.section_id || (q.section_id === p.section_id && Number(q.km) < Number(p.km))) [p, q] = [q, p];
    if (p.section_id === q.section_id && Number(q.km) - Number(p.km) < 0.05) {
      return { error: "The start and end points are at the same spot on the trail." };
    }

    // A hike can cross a section boundary: split it at each boundary.
    const { data: sections } = await supabase.from("sections").select("id, length_km").order("id");
    const len = new Map((sections ?? []).map((s) => [s.id as number, Number(s.length_km)]));
    const segs: Segment[] = [];
    for (let id = p.section_id; id <= q.section_id; id++) {
      segs.push({
        section_id: id,
        from: id === p.section_id ? Number(p.km) : 0,
        to: id === q.section_id ? Number(q.km) : (len.get(id) ?? 0),
      });
    }
    // The section dropdown follows where the hike actually started.
    hike.section_id = p.section_id;
    return segs;
  }

  return []; // "Not yet"
}

async function saveSegments(supabase: Supabase, hikeId: string, segs: Segment[]) {
  // Replace whatever the hike had. RLS only lets you touch segments of your
  // own hikes, so this can't reach anyone else's.
  const del = await supabase.from("hike_segments").delete().eq("hike_id", hikeId);
  if (del.error) return del.error.message;
  if (!segs.length) return null;
  const ins = await supabase
    .from("hike_segments")
    .insert(segs.map((s) => ({ hike_id: hikeId, section_id: s.section_id, km: `[${s.from},${s.to})` })));
  return ins.error ? friendly(ins.error.message) : null;
}

const friendly = (msg: string) =>
  msg.includes("runs past the end of section")
    ? "That km range runs past the end of the section. Check the section's length."
    : msg;

export async function createHike(_prev: HikeFormState, form: FormData): Promise<HikeFormState> {
  const hike = parseHike(form);
  if ("error" in hike) return hike;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const placement = await resolvePlacement(supabase, form, hike);
  if (!Array.isArray(placement) && placement !== "keep") return placement;

  // We still send user_id. RLS's `with check` rejects the insert if it's
  // anyone but the signed-in person.
  const { data, error } = await supabase
    .from("hikes")
    .insert({ ...hike, user_id: user.id, source: "manual" })
    .select("id")
    .single();
  if (error) return { error: error.message };

  if (Array.isArray(placement)) {
    const segError = await saveSegments(supabase, data.id, placement);
    if (segError) {
      // Two separate requests aren't one transaction, so undo the hike by hand.
      await supabase.from("hikes").delete().eq("id", data.id);
      return { error: segError };
    }
  }

  revalidatePath("/");
  redirect("/");
}

export async function updateHike(id: string, canPlace: boolean, _prev: HikeFormState, form: FormData): Promise<HikeFormState> {
  const hike = parseHike(form);
  if ("error" in hike) return hike;

  const supabase = await createClient();
  const placement = canPlace ? await resolvePlacement(supabase, form, hike) : "keep";
  if (!Array.isArray(placement) && placement !== "keep") return placement;

  const { data, error } = await supabase.from("hikes").update(hike).eq("id", id).select("id");
  if (error) return { error: error.message };
  // RLS skips rows you can't see without an error, so check something changed.
  if (!data?.length) return { error: "That hike wasn't found." };

  if (Array.isArray(placement)) {
    const segError = await saveSegments(supabase, id, placement);
    if (segError) return { error: segError };
  }

  revalidatePath("/");
  redirect("/");
}

export async function deleteHike(id: string) {
  const supabase = await createClient();
  // Segments go with it: the foreign key is `on delete cascade`.
  await supabase.from("hikes").delete().eq("id", id);
  revalidatePath("/");
  redirect("/");
}

/** Where a tapped map point lands on the trail, for the map picker. */
export async function snapPoint(lat: number, lon: number) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return { error: "That point couldn't be read." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("snap_to_trail", { lat, lon }).single();
  if (error || !data) return { error: "Couldn't find the trail near there." };
  const d = data as { section_id: number; km: number; distance_m: number; snap_lat: number; snap_lon: number };
  if (Number(d.distance_m) > MAX_OFF_TRAIL_M) {
    return { error: `That's ${(Number(d.distance_m) / 1000).toFixed(1)} km from the trail. Tap closer to the white line.` };
  }
  return { sectionId: d.section_id, km: Number(d.km), lat: d.snap_lat, lon: d.snap_lon };
}

