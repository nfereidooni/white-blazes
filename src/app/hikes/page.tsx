import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";
import { SiteHeader, HeaderTitle } from "@/components/SiteHeader";
import { Footer } from "@/components/Footer";

type Hike = { id: string; hiked_on: string; name: string; walked_km: number | null; trail: "main" | "side"; hike_segments: { hike_id: string }[] };

const fmtDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });

/**
 * Every hike, newest first. The full Hikes tab (search, filters, year
 * groups, new km per hike) comes in a later stage; this is its frame.
 */
export default async function HikesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [viewer, { data }] = await Promise.all([
    getViewer(supabase, user),
    supabase.from("hikes").select("id, hiked_on, name, walked_km, trail, hike_segments(hike_id)").order("hiked_on", { ascending: false }),
  ]);
  const hikes = (data ?? []) as Hike[];
  const walked = hikes.reduce((a, h) => a + Number(h.walked_km ?? 0), 0);

  return (
    <div className="page">
      <SiteHeader active="hikes" name={viewer.name} photo={viewer.photo}>
        <HeaderTitle
          eyebrow={`${hikes.length} ${hikes.length === 1 ? "hike" : "hikes"} · ${Math.round(walked)} km walked`}
          title="Hikes"
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
        </section>

        <section className="card" aria-labelledby="log-h">
          <h2 id="log-h">Your hike log</h2>
          {hikes.length === 0 ? (
            <p className="muted">No hikes yet. Log your first one.</p>
          ) : (
            <ul className="hikes">
              {hikes.map((hk) => (
                <li key={hk.id}>
                  <span className="mono muted">{fmtDate(hk.hiked_on)}</span>
                  <Link href={`/hikes/${hk.id}/edit`} className="hike-name">
                    {hk.name}
                    {hk.trail === "side" && <span className="tag">side trail</span>}
                    {hk.trail === "main" && !hk.hike_segments.length && <span className="tag tag-needs">needs placing</span>}
                  </Link>
                  <span className="mono">{hk.walked_km != null ? `${Number(hk.walked_km).toFixed(1)} km` : ""}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="hint">
            <Link href="/settings">Download all my data</Link> as a spreadsheet.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
