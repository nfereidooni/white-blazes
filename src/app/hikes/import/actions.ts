"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Track = { lats: number[]; lons: number[]; hash: string; date: string | null };

export type Stretch = { sectionId: number; section: string; from: number; to: number };
export type Similar = { id: string; name: string; hikedOn: string; isClubHike: boolean; placed: boolean };
export type Preview = {
  stretches: Stretch[];
  onTrailKm: number;
  /** Set when this exact file was imported before. */
  duplicate: { name: string; hikedOn: string } | null;
  /** Hikes on the same day that cover the same trail, or haven't been placed yet. */
  similar: Similar[];
};

const parseRange = (r: string) => String(r).slice(1, -1).split(",").map(Number) as [number, number];

function checkTrack(t: Track) {
  if (!Array.isArray(t.lats) || t.lats.length < 2 || t.lats.length !== t.lons.length || t.lats.length > 20000) {
    throw new Error("That track couldn't be read.");
  }
  if (!/^[0-9a-f]{64}$/.test(t.hash)) throw new Error("That track couldn't be read.");
}

/** Work out where the track went, and look for hikes it might duplicate. Saves nothing. */
export async function previewTrack(t: Track): Promise<Preview | { error: string }> {
  try {
    checkTrack(t);
  } catch (e) {
    return { error: (e as Error).message };
  }
  const supabase = await createClient();

  const [match, sections, dup] = await Promise.all([
    supabase.rpc("match_track", { lats: t.lats, lons: t.lons }),
    supabase.from("sections").select("id, name"),
    // Layer 1: the same file, by fingerprint. RLS limits this to your own hikes.
    supabase.from("hikes").select("name, hiked_on").eq("source", "gpx").eq("external_id", t.hash).maybeSingle(),
  ]);
  if (match.error) return { error: match.error.message };

  const names = new Map((sections.data ?? []).map((s) => [s.id as number, s.name as string]));
  const stretches: Stretch[] = (match.data ?? []).map((m: { section_id: number; km_from: number; km_to: number }) => ({
    sectionId: m.section_id,
    section: names.get(m.section_id) ?? `Section ${m.section_id}`,
    from: Number(m.km_from),
    to: Number(m.km_to),
  }));

  // Layer 3: same day, same stretch of trail, from any source.
  let similar: Similar[] = [];
  if (t.date) {
    const { data } = await supabase
      .from("hikes")
      .select("id, name, hiked_on, is_club_hike, section_id, trail, hike_segments(section_id, km)")
      .eq("hiked_on", t.date);
    similar = (data ?? [])
      .filter((h) => {
        const segs = (h.hike_segments ?? []) as { section_id: number; km: string }[];
        if (!segs.length) {
          // An unplaced hike in the same section is probably this one.
          return h.trail === "main" && stretches.some((s) => s.sectionId === h.section_id);
        }
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

/** Save the hike and its stretches in one transaction (see import_track in migration 0700). */
export async function importTrack(
  t: Track & { name: string; walkedKm: number; isClubHike: boolean; replaceId: string | null },
): Promise<{ error: string } | void> {
  try {
    checkTrack(t);
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
    p_source: "gpx",
    p_external_id: t.hash,
    lats: t.lats,
    lons: t.lons,
    p_replace_hike: t.replaceId,
  });
  if (error) {
    // 23505 = unique violation: this file's fingerprint is already in your log.
    if (error.code === "23505") return { error: "You've already imported this file." };
    return { error: error.message };
  }

  revalidatePath("/");
  redirect("/");
}
