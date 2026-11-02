import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { avatarUrl } from "@/lib/avatar";
import { closestGap, parseMulti, parseRange, type Segment } from "@/lib/gaps";
import { SiteHeader } from "@/components/SiteHeader";
import { Footer } from "@/components/Footer";
import { Ribbon, totals, type SectionRow } from "@/components/TrailProgress";
import { BadgeRing } from "@/components/Badge";
import { HikeCalendar, CalendarLegend } from "@/components/HikeCalendar";
import { setSharing } from "./share-actions";

type Section = { id: number; slug: string; name: string; length_km: number; club_badge_url: string };
type Progress = { section_id: number; done_km: number; covered: string };
type Hike = { id: string; hiked_on: string; name: string; walked_km: number | null; trail: "main" | "side"; section_id: number | null };
type SegRow = { hike_id: string; section_id: number; km: string; hikes: { start_point: string | null; end_point: string | null } };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const short = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}`;
const longMonth = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("en-CA", { month: "long", year: "numeric" });
const km1 = (n: number) => n.toFixed(1);

export default async function Home({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const { year } = await searchParams;
  const supabase = await createClient();

  // getUser() checks the session with the Auth server, so it can't be faked
  // by editing a cookie. The middleware already redirects signed-out
  // visitors; this is a second lock on the same door.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Six queries in parallel. None of them says "where user_id = me":
  // Row Level Security adds that filter inside Postgres.
  const [sectionsRes, progressRes, profileRes, hikesRes, segRes, clubsRes] = await Promise.all([
    supabase.from("sections").select("id, slug, name, length_km, club_badge_url").order("id"),
    supabase.from("section_progress").select("section_id, done_km, covered"),
    supabase.from("profiles").select("display_name, share_enabled, share_slug, goal, avatar_path").single(),
    supabase.from("hikes").select("id, hiked_on, name, walked_km, trail, section_id").order("hiked_on", { ascending: false }),
    supabase.from("hike_segments").select("hike_id, section_id, km, hikes!inner(start_point, end_point)"),
    supabase.from("profile_clubs").select("section_id"),
  ]);

  const progress = new Map(((progressRes.data ?? []) as Progress[]).map((p) => [p.section_id, p]));
  const hikes = (hikesRes.data ?? []) as Hike[];
  const segRows = (segRes.data ?? []) as unknown as SegRow[];
  const homeClubs = new Set((clubsRes.data ?? []).map((r) => r.section_id as number));
  const withHikes = new Set(hikes.map((h) => h.section_id));

  const raw = (sectionsRes.data ?? []) as Section[];
  const sections: (SectionRow & { slug: string; home: boolean })[] = raw.map((s) => {
    const done = Number(progress.get(s.id)?.done_km ?? 0);
    return {
      ...s,
      length_km: Number(s.length_km),
      done_km: done,
      home: homeClubs.has(s.id),
      logHref: done > 0 || withHikes.has(s.id) ? `/log/${s.slug}` : undefined,
    };
  });
  const { totalKm, doneKm, pct, started } = totals(sections);

  // Km on the trail per hike: the sum of its placed stretches.
  const segments: Segment[] = segRows.map((r) => {
    const [from, to] = parseRange(r.km);
    return { sectionId: r.section_id, from, to, startPoint: r.hikes.start_point, endPoint: r.hikes.end_point };
  });
  const trailKm = new Map<string, number>();
  segRows.forEach((r, i) => trailKm.set(r.hike_id, (trailKm.get(r.hike_id) ?? 0) + segments[i].to - segments[i].from));
  const placed = new Set(trailKm.keys());

  // Calendar: km per day. Placed hikes count their trail km, others their walked distance.
  const days = new Map<string, number>();
  for (const h of hikes) {
    const km = trailKm.get(h.id) ?? Number(h.walked_km ?? 0);
    days.set(h.hiked_on, (days.get(h.hiked_on) ?? 0) + km);
  }
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Toronto" });

  // Calendar range: the past 12 months, or one calendar year from the chips.
  const years = [...new Set(hikes.map((h) => h.hiked_on.slice(0, 4)))].sort().reverse();
  const pickedYear = year && years.includes(year) ? year : null;
  const yearAgo = new Date(`${today}T00:00:00Z`);
  yearAgo.setUTCDate(yearAgo.getUTCDate() - 364);
  const calFrom = pickedYear ? `${pickedYear}-01-01` : yearAgo.toISOString().slice(0, 10);
  const calTo = pickedYear ? (pickedYear === today.slice(0, 4) ? today : `${pickedYear}-12-31`) : today;
  const inRange = hikes.filter((h) => h.hiked_on >= calFrom && h.hiked_on <= calTo).length;
  const plural = (n: number) => `${n} ${n === 1 ? "hike" : "hikes"}`;

  const gap = closestGap(
    raw.map((s) => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
      lengthKm: Number(s.length_km),
      covered: parseMulti(progress.get(s.id)?.covered),
      doneKm: Number(progress.get(s.id)?.done_km ?? 0),
    })),
    segments,
  );

  const unplaced = hikes.filter((h) => h.trail === "main" && !placed.has(h.id)).length;
  const recent = hikes.slice(0, 5);
  const profile = profileRes.data;
  const name = profile?.display_name ?? user.email ?? "";
  const photo = await avatarUrl(supabase, profile?.avatar_path);

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const shareUrl = profile ? `${origin}/p/${profile.share_slug}` : "";

  return (
    <div className="page">
      <SiteHeader active="home" name={name} photo={photo} variant="tall">
        <div className="hero-body">
          <p className="eyebrow">Niagara to Tobermory</p>
          <div className="hero-figure">
            <h1>
              {km1(doneKm)}
              <span> km</span>
            </h1>
            <p className="sub">
              of {Math.round(totalKm)} km hiked · {started} of 9 sections started
              <br />
              <strong>{pct}% of the Bruce Trail</strong>
            </p>
          </div>
          {profile?.goal && (
            <p className="goal">
              Goal: <strong>{profile.goal}</strong>
            </p>
          )}
          <div className="hero-actions">
            <Link href="/hikes/new" className="button-light">
              Log a hike
            </Link>
            <Link href="/hikes/import" className="button-outline-light">
              Import hikes
            </Link>
          </div>
        </div>
      </SiteHeader>

      <main className="content">
        <section className="card" aria-labelledby="ribbon-h">
          <div className="card-head">
            <h2 id="ribbon-h">The whole trail</h2>
            <span className="mono">9 sections · {Math.round(totalKm)} km</span>
          </div>
          <Ribbon sections={sections} />
        </section>

        <section className="card" aria-labelledby="cal-h">
          <div className="card-head">
            <h2 id="cal-h">
              {hikes.length === 0
                ? "Your hiking calendar"
                : pickedYear
                  ? `${plural(inRange)} in ${pickedYear}`
                  : `${plural(inRange)} in the past year`}
            </h2>
            {hikes.length > 0 && <CalendarLegend />}
          </div>
          {hikes.length === 0 ? (
            <p className="muted">Your hikes will show up here, one square per day.</p>
          ) : (
            <>
              <nav className="year-chips" aria-label="Calendar year">
                <Link href="/" scroll={false} className={pickedYear ? "chip" : "chip chip-on"} aria-current={pickedYear ? undefined : "true"}>
                  Past year
                </Link>
                {years.map((y) => (
                  <Link key={y} href={`/?year=${y}`} scroll={false} className={y === pickedYear ? "chip chip-on" : "chip"} aria-current={y === pickedYear ? "true" : undefined}>
                    {y}
                  </Link>
                ))}
              </nav>
              <HikeCalendar days={days} from={calFrom} to={calTo} />
              <p className="hint">
                {plural(hikes.length)} in all since {longMonth(hikes[hikes.length - 1].hiked_on)}.
              </p>
            </>
          )}
        </section>

        <div className="columns">
          <section className="card sections-card" aria-labelledby="sections-h">
            <div>
              <h2 id="sections-h">Sections</h2>
              <p className="muted card-lede">
                Progress toward each club&rsquo;s end to end badge. Open a section&rsquo;s trail log to print or download
                your record for the badge application.
              </p>
            </div>
            <ul className="badge-grid">
              {sections.map((s) => {
                const f = s.length_km ? s.done_km / s.length_km : 0;
                return (
                  <li key={s.id} className="badge-card">
                    <BadgeRing kind={s.slug} fraction={f} />
                    <span className="badge-name">{s.name}</span>
                    {s.home && <span className="tag tag-club">your club</span>}
                    <span className="mono badge-km">
                      {km1(s.done_km)} of {s.length_km} km · {Math.round(Math.min(1, f) * 100)}%
                    </span>
                    <span className="badge-links">
                      {s.logHref && <Link href={s.logHref}>Trail log</Link>}
                      {s.club_badge_url && (
                        <a href={s.club_badge_url} target="_blank" rel="noopener noreferrer">
                          Club badges<span className="sr-only"> for {s.name} (opens in a new tab)</span>
                        </a>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          <div className="stack">
            {gap && (
              <section className="card card-dark" aria-labelledby="gap-h">
                <p id="gap-h" className="eyebrow eyebrow-amber">
                  {gap.kind === "between" ? "Closest gap" : "Pick up where you left off"}
                </p>
                <p className="gap-title">
                  {gap.fromName && gap.toName ? `${gap.fromName} to ${gap.toName}` : `${gap.sectionName}, km ${km1(gap.from)} to ${km1(gap.to)}`}
                </p>
                <p className="gap-detail">
                  {gap.fromName && gap.toName && `${gap.sectionName} km ${km1(gap.from)} to ${km1(gap.to)}. `}
                  {gap.kind === "between"
                    ? `A ${km1(gap.to - gap.from)} km stretch between two parts you've already hiked.`
                    : `${km1(gap.to - gap.from)} km to the end of the section.`}
                </p>
                <Link href={`/map?s=${gap.sectionSlug}`} className="gap-link">
                  See it on the map
                </Link>
              </section>
            )}

            <section className="card" aria-labelledby="share-h">
              <h2 id="share-h">Share your progress</h2>
              {profile?.share_enabled ? (
                <>
                  <p className="muted">
                    Anyone with this link sees your km per section, not your hikes or dates. Your photo and goal show only
                    if you turn them on in <Link href="/settings">settings</Link>.
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

            <section className="card" aria-labelledby="recent-h">
              <div className="card-head">
                <h2 id="recent-h">Recent hikes</h2>
                <Link href="/hikes" className="small-link">
                  All hikes
                </Link>
              </div>
              {unplaced > 0 && (
                <p className="hint">
                  {unplaced === 1 ? "1 hike needs" : `${unplaced} hikes need`} placing on the trail before{" "}
                  {unplaced === 1 ? "it counts" : "they count"} toward your section km.
                </p>
              )}
              {recent.length === 0 ? (
                <p className="muted">No hikes yet. Log your first one.</p>
              ) : (
                <ul className="hikes hikes-compact">
                  {recent.map((hk) => (
                    <li key={hk.id}>
                      <span className="mono muted">{short(hk.hiked_on)}</span>
                      <Link href={`/hikes/${hk.id}/edit`} className="hike-name">
                        {hk.name}
                        {hk.trail === "side" && <span className="tag">side trail</span>}
                        {hk.trail === "main" && !placed.has(hk.id) && <span className="tag tag-needs">needs placing</span>}
                      </Link>
                      <span className="mono">{hk.walked_km != null ? `${km1(Number(hk.walked_km))} km` : ""}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <p className="soon-box">
              <strong>Side trail badges are coming soon.</strong> Side trail hikes you log now stay in your hike log.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
