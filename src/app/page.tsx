import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/Logo";
import { Ribbon, SectionList, totals, type SectionRow } from "@/components/TrailProgress";
import { setSharing } from "./share-actions";
import { Footer } from "@/components/Footer";

type Section = { id: number; slug: string; name: string; length_km: number; club_badge_url: string };
type Progress = { section_id: number; done_km: number };
type Hike = { id: string; hiked_on: string; name: string; walked_km: number | null; trail: "main" | "side" };

const fmtDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });

export default async function Home() {
  const supabase = await createClient();

  // getUser() checks the session with the Auth server, so it can't be faked
  // by editing a cookie. The middleware already redirects signed-out
  // visitors; this is a second lock on the same door.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Four queries in parallel. None of them says "where user_id = me":
  // Row Level Security adds that filter inside Postgres.
  const [sectionsRes, progressRes, profileRes, hikesRes, placedRes] = await Promise.all([
    supabase.from("sections").select("id, slug, name, length_km, club_badge_url").order("id"),
    supabase.from("section_progress").select("section_id, done_km"),
    supabase.from("profiles").select("display_name, share_enabled, share_slug").single(),
    supabase.from("hikes").select("id, hiked_on, name, walked_km, trail").order("hiked_on", { ascending: false }),
    supabase.from("hike_segments").select("hike_id"),
  ]);

  const progress = new Map(((progressRes.data ?? []) as Progress[]).map((p) => [p.section_id, Number(p.done_km)]));
  const sections: SectionRow[] = ((sectionsRes.data ?? []) as Section[]).map((s) => ({
    ...s,
    length_km: Number(s.length_km),
    done_km: progress.get(s.id) ?? 0,
  }));
  const hikes = (hikesRes.data ?? []) as Hike[];
  // A main-trail hike with no segments hasn't been placed yet, so it adds no km.
  const placed = new Set((placedRes.data ?? []).map((r) => r.hike_id as string));
  const unplaced = hikes.filter((hk) => hk.trail === "main" && !placed.has(hk.id)).length;
  const profile = profileRes.data;
  const name = profile?.display_name ?? user.email;
  const { totalKm, doneKm, pct, started } = totals(sections);

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const shareUrl = profile ? `${origin}/p/${profile.share_slug}` : "";

  return (
    <div className="page">
      <header className="hero">
        <div className="bar">
          <Logo />
          <form action="/auth/signout" method="post" className="account">
            <Link href="/settings" className="account-name">
              {name}
            </Link>
            <button type="submit">Sign out</button>
          </form>
        </div>
        <div className="hero-body">
          <p className="eyebrow">Niagara to Tobermory</p>
          <h1>
            {doneKm.toFixed(1)}
            <span> km</span>
          </h1>
          <p className="sub">
            of {Math.round(totalKm)} km · <strong>{pct}% of the Bruce Trail</strong> · {started} of 9 sections started
          </p>
          <div className="hero-actions">
            <Link href="/hikes/new" className="button-light">
              Log a hike
            </Link>
          </div>
        </div>
      </header>

      <main className="content">
        <section className="card" aria-labelledby="ribbon-h">
          <div className="card-head">
            <h2 id="ribbon-h">The whole trail</h2>
            <span className="mono">9 sections · {Math.round(totalKm)} km</span>
          </div>
          <Ribbon sections={sections} />
        </section>

        <div className="columns">
          <section className="card" aria-labelledby="sections-h">
            <h2 id="sections-h">Sections</h2>
            <SectionList sections={sections} />
          </section>

          <div className="stack">
            <section className="card" aria-labelledby="share-h">
              <h2 id="share-h">Share your progress</h2>
              {profile?.share_enabled ? (
                <>
                  <p className="muted">
                    Anyone with this link can see your km per section. They can&rsquo;t see your hikes or dates.
                  </p>
                  <label htmlFor="share-url" className="sr-only">
                    Your share link
                  </label>
                  <input id="share-url" className="share-url" readOnly value={shareUrl} />
                  <div className="actions">
                    <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="secondary">
                      Open it<span className="sr-only"> (opens in a new tab)</span>
                    </a>
                    <form action={setSharing.bind(null, false)}>
                      <button type="submit" className="secondary">
                        Turn off link
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                <>
                  <p className="muted">Get a link that shows friends how far you&rsquo;ve come. You can turn it off any time.</p>
                  <form action={setSharing.bind(null, true)}>
                    <button type="submit" className="primary">
                      Turn on share link
                    </button>
                  </form>
                </>
              )}
            </section>

            <section className="card" aria-labelledby="hikes-h">
              <div className="card-head">
                <h2 id="hikes-h">Your hikes</h2>
                <Link href="/hikes/new">Log a hike</Link>
              </div>
              {unplaced > 0 && (
                <p className="hint">
                  {unplaced === 1 ? "1 hike needs" : `${unplaced} hikes need`} placing on the trail before{" "}
                  {unplaced === 1 ? "it counts" : "they count"} toward your section km.
                </p>
              )}
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
                        {hk.trail === "main" && !placed.has(hk.id) && <span className="tag tag-needs">needs placing</span>}
                      </Link>
                      <span className="mono">{hk.walked_km != null ? `${Number(hk.walked_km).toFixed(1)} km` : "?"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
