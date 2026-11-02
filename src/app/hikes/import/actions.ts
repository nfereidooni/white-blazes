"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * A track from either a GPX file or a Strava archive.
 * externalId: the file's SHA-256 fingerprint for GPX, the activity id for Strava.
 */
export type TrackInput = {
  source: "gpx" | "strava";
  externalId: string;
  lats: number[];
  lons: number[];
  date: string | null;
};

export type Stretch = { sectionId: number; section: string; from: number; to: number };
export type Similar = { id: string; name: string; hikedOn: string; isClubHike: boolean; placed: boolean };
export type Preview = {
  stretches: Stretch[];
  onTrailKm: number;
  /** Set when this exact file or activity was imported before. */
  duplicate: { name: string; hikedOn: string } | null;
  /** Hikes on the same day that cover the same trail, or haven't been placed yet. */
  similar: Similar[];
};

const parseRange = (r: string) => String(r).slice(1, -1).split(",").map(Number) as [number, number];

function check(t: TrackInput) {
  const ok =
    (t.source === "gpx" || t.source === "strava") &&
    Array.isArray(t.lats) &&
    Array.isArray(t.lons) &&
    t.lats.length >= 2 &&
    t.lats.length === t.lons.length &&
    t.lats.length <= 20000 &&
    (t.source === "gpx" ? /^[0-9a-f]{64}$/.test(t.externalId) : /^\d{1,20}$/.test(t.externalId));
  if (!ok) throw new Error("That track couldn't be read.");
}

async function previewOne(supabase: Supabase, t: TrackInput, names: Map<number, string>): Promise<Preview> {
  check(t);
  const [match, dup] = await Promise.all([
    supabase.rpc("match_track", { lats: t.lats, lons: t.lons }),
    // Layers 1 and 2: the same file (fingerprint) or the same Strava activity (id).
    supabase.from("hikes").select("name, hiked_on").eq("source", t.source).eq("external_id", t.externalId).maybeSingle(),
  ]);
  if (match.error) throw new Error(match.error.message);

  const stretches: Stretch[] = (match.data ?? []).map((m: { section_id: number; km_from: number; km_to: number }) => ({
    sectionId: m.section_id,
    section: names.get(m.section_id) ?? `Section ${m.section_id}`,
    from: Number(m.km_from),
    to: Number(m.km_to),
  }));

  // Layer 3: same day, same stretch of trail, from any source.
  let similar: Similar[] = [];
  if (t.date && !dup.data) {
    const { data } = await supabase
      .from("hikes")
      .select("id, name, hiked_on, is_club_hike, section_id, trail, hike_segments(section_id, km)")
      .eq("hiked_on", t.date);
    similar = (data ?? [])
      .filter((h) => {
        const segs = (h.hike_segments ?? []) as { section_id: number; km: string }[];
        if (!segs.length) return h.trail === "main" && stretches.some((s) => s.sectionId === h.section_id);
        return segs.some((g) => {
          const [a, b] = parseRange(g.km);
          return stretches.some((s) => s.sectionId === g.section_id && s.from < b && a < s.to);
        });
      })
      .map((h) => ({
        id: h.id,
        name: h.name,
        hikedOn: h.hiked_on,
        isClubHike: h.is_club_hike,
        placed: ((h.hike_segments ?? []) as unknown[]).length > 0,
      }));
  }

  return {
    stretches,
    onTrailKm: Math.round(stretches.reduce((a, s) => a + (s.to - s.from), 0) * 10) / 10,
    duplicate: dup.data ? { name: dup.data.name, hikedOn: dup.data.hiked_on } : null,
    similar,
  };
}

async function sectionNames(supabase: Supabase) {
  const { data } = await supabase.from("sections").select("id, name");
  return new Map((data ?? []).map((s) => [s.id as number, s.name as string]));
}

/** Work out where one track went, and look for hikes it might duplicate. Saves nothing. */
export async function previewTrack(t: TrackInput): Promise<Preview | { error: string }> {
  try {
    const supabase = await createClient();
    return await previewOne(supabase, t, await sectionNames(supabase));
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** The same for a handful of tracks at once (the browser sends a Strava archive in batches). */
export async function previewTracks(ts: TrackInput[]): Promise<(Preview | { error: string })[]> {
  if (!Array.isArray(ts) || ts.length > 10) return [];
  const supabase = await createClient();
  const names = await sectionNames(supabase);
  const out: (Preview | { error: string })[] = [];
  for (const t of ts) {
    try {
      out.push(await previewOne(supabase, t, names));
    } catch (e) {
      out.push({ error: (e as Error).message });
    }
  }
  return out;
}

export type ImportInput = TrackInput & {
  name: string;
  walkedKm: number;
  isClubHike: boolean;
  replaceId: string | null;
};

/** Save one hike and its stretches in one transaction (import_track, migration 0700). */
export async function importTrack(t: ImportInput, goHome = true): Promise<{ error: string } | { ok: true }> {
  try {
    check(t);
  } catch (e) {
    return { error: (e as Error).message };
  }
  const name = t.name.trim();
  if (!name || name.length > 200) return { error: "Give the hike a name." };
  if (!t.date || !/^\d{4}-\d{2}-\d{2}$/.test(t.date)) return { error: "Pick the date you hiked." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("import_track", {
    p_name: name,
    p_hiked_on: t.date,
    p_walked_km: t.walkedKm,
    p_is_club_hike: t.isClubHike,
    p_source: t.source,
    p_external_id: t.externalId,
    lats: t.lats,
    lons: t.lons,
    p_replace_hike: t.replaceId,
  });
  if (error) {
    // 23505 = unique violation: this file or activity is already in your log.
    if (error.code === "23505") return { error: "Already imported." };
    return { error: error.message };
  }

  revalidatePath("/");
  if (goHome) redirect("/");
  return { ok: true };
}
