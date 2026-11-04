import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";
import { SiteHeader, HeaderTitle } from "@/components/SiteHeader";
import { Footer } from "@/components/Footer";
import { HikeLog, type LogHike } from "./HikeLog";

type Row = {
  id: string;
  hiked_on: string;
  name: string;
  walked_km: number | null;
  trail: "main" | "side";
  section_id: number | null;
  is_club_hike: boolean;
  source: string;
  notes: string | null;
  hiked_with: string | null;
  hike_leader: string | null;
  start_point: string | null;
  end_point: string | null;
  hike_segments: { section_id: number }[];
};

export default async function HikesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // hike_new_km is a view: each hike's km of trail not covered by an earlier hike.
  const [viewer, hikesRes, sectionsRes, newRes] = await Promise.all([
    getViewer(supabase, user),
    supabase
      .from("hikes")
      .select("id, hiked_on, name, walked_km, trail, section_id, is_club_hike, source, notes, hiked_with, hike_leader, start_point, end_point, hike_segments(section_id)")
      .order("hiked_on", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("sections").select("id, slug, name"),
    supabase.from("hike_new_km").select("hike_id, new_km"),
  ]);

  const sections = new Map((sectionsRes.data ?? []).map((s) => [s.id as number, s as { id: number; slug: string; name: string }]));
  const newKm = new Map((newRes.data ?? []).map((r) => [r.hike_id as string, Number(r.new_km)]));
  const rows = (hikesRes.data ?? []) as Row[];

  const hikes: LogHike[] = rows.map((h) => {
    const ids = [...new Set(h.hike_segments.map((g) => g.section_id))].sort((a, b) => a - b);
    if (!ids.length && h.section_id) ids.push(h.section_id);
    const names = ids.map((id) => sections.get(id)?.name).filter(Boolean) as string[];
    const where = h.trail === "side" ? `${names.join(" and ") || "Side trail"} side trails` : names.join(" and ") || "Not placed yet";
    return {
      id: h.id,
      date: h.hiked_on,
      name: h.name,
      walkedKm: h.walked_km != null ? Number(h.walked_km) : null,
      newKm: newKm.get(h.id) ?? 0,
      trail: h.trail,
      placed: h.hike_segments.length > 0,
      club: h.is_club_hike,
      source: h.source,
      badge: h.trail === "main" && ids.length ? (sections.get(ids[0])?.slug ?? null) : null,
      sections: where,
      // Everything search looks through, lowercased once here.
      search: [h.name, where, h.notes, h.hiked_with, h.hike_leader, h.start_point, h.end_point, h.hiked_on].filter(Boolean).join(" ").toLowerCase(),
    };
  });
  const walked = hikes.reduce((a, h) => a + (h.walkedKm ?? 0), 0);

  return (
    <div className="page">
      <SiteHeader active="hikes" name={viewer.name} photo={viewer.photo}>
        <HeaderTitle
          eyebrow={`${hikes.length} ${hikes.length === 1 ? "hike" : "hikes"} · ${Math.round(walked)} km walked`}
          title="Hike log"
        />
      </SiteHeader>
      <main className="content content-inner">
        <section className="card" aria-labelledby="add-h">
          <h2 id="add-h">Add hikes</h2>
          <div className="add-grid">
            <Link href="/hikes/new" className="add-card add-card-main">
              <strong>Log a hike</strong>
              <span>Pick the start and end on the map, type coordinates or km, or place it later.</span>
            </Link>
            <Link href="/hikes/import" className="add-card">
              <strong>Upload a GPX file</strong>
              <span>From a watch, AllTrails, Gaia or any app that exports a track. Read in your browser and never stored.</span>
            </Link>
            <Link href="/hikes/import?from=strava" className="add-card">
              <strong>Import your Strava archive</strong>
              <span>Request your archive from Strava, then drop the .zip here. Hikes and walks with GPS come in for review.</span>
            </Link>
          </div>
          <p className="hint">
            Duplicates are caught by file, by Strava activity, and by same-day hikes over the same stretch. You can replace or
            skip each one.
          </p>
        </section>

        <section className="card" aria-labelledby="log-h">
          <div className="card-head">
            <h2 id="log-h">Your hikes</h2>
            <a href="/api/export" className="small-link" download>
              Download all my data
            </a>
          </div>
          <HikeLog hikes={hikes} />
        </section>
      </main>
      <Footer />
    </div>
  );
}
