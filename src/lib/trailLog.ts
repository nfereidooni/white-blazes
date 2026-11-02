import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export const CLUBS: Record<string, string> = {
  niagara: "Niagara Bruce Trail Club",
  iroquoia: "Iroquoia Bruce Trail Club",
  toronto: "Toronto Bruce Trail Club",
  caledon: "Caledon Hills Bruce Trail Club",
  dufferin: "Dufferin Hi-Land Bruce Trail Club",
  blue: "Blue Mountains Bruce Trail Club",
  beaver: "Beaver Valley Bruce Trail Club",
  sydenham: "Sydenham Bruce Trail Club",
  peninsula: "Peninsula Bruce Trail Club",
};

export type LogRow = {
  hikeId: string;
  date: string;
  name: string;
  startPoint: string | null;
  endPoint: string | null;
  from: number;
  to: number;
  isClubHike: boolean;
  leader: string | null;
  clubLink: string | null;
  activityLink: string | null;
};

export type TrailLog = {
  hiker: string;
  section: { id: number; slug: string; name: string; lengthKm: number; club: string; badgeUrl: string };
  doneKm: number;
  gapFillM: number;
  rows: LogRow[];
  gaps: { from: number; to: number }[];
  unplaced: { id: string; date: string; name: string }[];
};

/** "{[0.0,27.6),[43.0,83.8)}" → [[0, 27.6], [43, 83.8]] */
function parseMulti(m: string | null): [number, number][] {
  return [...String(m ?? "").matchAll(/[[(]([\d.]+),([\d.]+)[\])]/g)].map((x) => [Number(x[1]), Number(x[2])]);
}

const parseRange = (r: string) => String(r).slice(1, -1).split(",").map(Number) as [number, number];

/**
 * Everything the trail log shows for one section. Every query runs as the
 * signed-in person, so RLS limits it to their own hikes.
 */
export async function getTrailLog(supabase: Supabase, slug: string): Promise<TrailLog | null> {
  const { data: section } = await supabase
    .from("sections")
    .select("id, slug, name, length_km, club_badge_url")
    .eq("slug", slug)
    .maybeSingle();
  if (!section) return null;

  const [profileRes, progressRes, segRes, filedRes] = await Promise.all([
    supabase.from("profiles").select("display_name, gap_fill_m").single(),
    supabase.from("section_progress").select("covered, done_km").eq("section_id", section.id).maybeSingle(),
    supabase
      .from("hike_segments")
      .select(
        "km, hikes!inner(id, name, hiked_on, is_club_hike, hike_leader, club_link, link, start_point, end_point)",
      )
      .eq("section_id", section.id),
    supabase.from("hikes").select("id, name, hiked_on, trail, hike_segments(id)").eq("section_id", section.id),
  ]);

  type HikeRow = {
    id: string;
    name: string;
    hiked_on: string;
    is_club_hike: boolean;
    hike_leader: string | null;
    club_link: string | null;
    link: string | null;
    start_point: string | null;
    end_point: string | null;
  };
  const rows: LogRow[] = ((segRes.data ?? []) as unknown as { km: string; hikes: HikeRow }[])
    .map(({ km, hikes: h }) => {
      const [from, to] = parseRange(km);
      return {
        hikeId: h.id,
        date: h.hiked_on,
        name: h.name,
        startPoint: h.start_point,
        endPoint: h.end_point,
        from,
        to,
        isClubHike: h.is_club_hike,
        leader: h.hike_leader,
        clubLink: h.club_link,
        activityLink: h.link,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.from - b.from);

  const length = Number(section.length_km);
  const covered = parseMulti(progressRes.data?.covered ?? null);
  const gaps: { from: number; to: number }[] = [];
  let at = 0;
  for (const [a, b] of covered) {
    if (a - at >= 0.05) gaps.push({ from: at, to: a });
    at = Math.max(at, b);
  }
  if (length - at >= 0.05) gaps.push({ from: at, to: length });

  const unplaced = (filedRes.data ?? [])
    .filter((h) => h.trail === "main" && !(h.hike_segments as unknown[] | null)?.length)
    .map((h) => ({ id: h.id as string, date: h.hiked_on as string, name: h.name as string }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    hiker: profileRes.data?.display_name ?? "",
    section: {
      id: section.id,
      slug: section.slug,
      name: section.name,
      lengthKm: length,
      club: CLUBS[section.slug] ?? `${section.name} Bruce Trail Club`,
      badgeUrl: section.club_badge_url,
    },
    doneKm: Number(progressRes.data?.done_km ?? 0),
    gapFillM: profileRes.data?.gap_fill_m ?? 300,
    rows,
    gaps,
    unplaced,
  };
}
