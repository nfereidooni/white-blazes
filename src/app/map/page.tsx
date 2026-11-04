import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";
import { CLUBS } from "@/lib/trailLog";
import {
  closestGap,
  parseMulti,
  parseRange,
  sectionGaps,
  type Segment,
} from "@/lib/gaps";
import { SiteHeader, HeaderTitle } from "@/components/SiteHeader";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/Badge";
import { TrailMap } from "@/components/TrailMap";

type Section = {
  id: number;
  slug: string;
  name: string;
  length_km: number;
  club_badge_url: string;
  start_name: string;
  end_name: string;
  sights: string | null;
};
type SegRow = {
  section_id: number;
  km: string;
  hikes: {
    id: string;
    name: string;
    hiked_on: string;
    start_point: string | null;
    end_point: string | null;
  };
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const short = (iso: string) =>
  `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}, ${iso.slice(0, 4)}`;
const km1 = (n: number) => n.toFixed(1);

/**
 * The Map tab. The section in the side panel comes from the URL (?s=iroquoia),
 * so a chip or a tap on the map is just a link, and the page can be shared
 * or bookmarked on a section.
 */
export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string }>;
}) {
  const { s: wanted } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [viewer, sectionsRes, progressRes, segRes, clubsRes] =
    await Promise.all([
      getViewer(supabase, user),
      supabase
        .from("sections")
        .select(
          "id, slug, name, length_km, club_badge_url, start_name, end_name, sights",
        )
        .order("id"),
      supabase.from("section_progress").select("section_id, done_km, covered"),
      supabase
        .from("hike_segments")
        .select(
          "section_id, km, hikes!inner(id, name, hiked_on, start_point, end_point)",
        ),
      supabase.from("profile_clubs").select("section_id"),
    ]);

  const sections = (sectionsRes.data ?? []) as Section[];
  const progress = new Map(
    (progressRes.data ?? []).map((p) => [p.section_id as number, p]),
  );
  const segRows = (segRes.data ?? []) as unknown as SegRow[];
  const homeClubs = new Set(
    (clubsRes.data ?? []).map((r) => r.section_id as number),
  );
  const segments: (Segment & { hike: SegRow["hikes"] })[] = segRows.map((r) => {
    const [from, to] = parseRange(r.km);
    return {
      sectionId: r.section_id,
      from,
      to,
      startPoint: r.hikes.start_point,
      endPoint: r.hikes.end_point,
      hike: r.hikes,
    };
  });

  const info = sections.map((s) => ({
    id: s.id,
    slug: s.slug,
    name: s.name,
    lengthKm: Number(s.length_km),
    covered: parseMulti(progress.get(s.id)?.covered),
    doneKm: Number(progress.get(s.id)?.done_km ?? 0),
  }));
  const gap = closestGap(info, segments);
  const totalKm = info.reduce((a, s) => a + s.lengthKm, 0);
  const doneKm = info.reduce((a, s) => a + s.doneKm, 0);

  // Which section to show: the one in the address, or none (the whole trail).
  const chosen = sections.find((s) => s.slug === wanted) ?? null;
  const sec = info.find((s) => s.id === chosen?.id);
  const secSegs = segments.filter((g) => g.sectionId === chosen?.id);
  const gaps = sec ? sectionGaps(sec.covered, sec.lengthKm, secSegs) : [];
  const gapHere = gap && gap.sectionSlug === chosen?.slug ? gap : null;
  const hikesHere = secSegs
    .map((g) => ({ ...g.hike, km: g.to - g.from }))
    .sort((a, b) => b.hiked_on.localeCompare(a.hiked_on));
  const pct = sec ? Math.round((sec.doneKm / sec.lengthKm) * 100) : 0;

  // The bar under the section: hiked stretches and gaps, in order.
  const bar: { from: number; to: number; kind: "hiked" | "gap" | "closest" }[] =
    [];
  if (sec) {
    for (const [a, b] of sec.covered)
      bar.push({ from: a, to: b, kind: "hiked" });
    for (const g of gaps)
      bar.push({
        from: g.from,
        to: g.to,
        kind:
          gapHere && Math.abs(g.from - gapHere.from) < 0.05 ? "closest" : "gap",
      });
    bar.sort((x, y) => x.from - y.from);
  }

  return (
    <div className="page">
      <SiteHeader active="map" name={viewer.name} photo={viewer.photo}>
        <HeaderTitle
          eyebrow={`${km1(doneKm)} of ${Math.round(totalKm)} km hiked`}
          title="Map"
        />
      </SiteHeader>

      <main className="content content-inner">
        <div className="columns map-columns">
          <section className="card map-card" aria-label="Trail map">
            <div className="map-legend">
              <span>
                <i className="key key-hiked" />
                Hiked
              </span>
              <span>
                <i className="key key-not" />
                Not yet
              </span>
              {gap && (
                <span>
                  <i className="key key-gap" />
                  Closest gap
                </span>
              )}
              {chosen && (
                <span>
                  <i className="key key-selected" />
                  Selected section
                </span>
              )}
            </div>
            <TrailMap
              sections={info.map(({ id, slug, lengthKm, covered }) => ({
                id,
                slug,
                lengthKm,
                covered,
              }))}
              selectedId={chosen?.id ?? null}
              gap={
                gap
                  ? {
                      sectionId: info.find((s) => s.slug === gap.sectionSlug)!
                        .id,
                      from: gap.from,
                      to: gap.to,
                    }
                  : null
              }
            />
            <p className="hint">
              Tap the trail to open a section. Trail line from OpenStreetMap,
              not for navigation.
            </p>
          </section>

          <aside className="stack" aria-labelledby={chosen ? "sec-h" : "all-h"}>
            <nav className="section-chips wrap" aria-label="Choose a section">
              <Link
                href="/map"
                scroll={false}
                className={chosen ? "chip" : "chip chip-on"}
                aria-current={chosen ? undefined : "true"}
              >
                Whole trail
              </Link>
              {sections.map((s) => (
                <Link
                  key={s.id}
                  href={`/map?s=${s.slug}`}
                  scroll={false}
                  className={s.id === chosen?.id ? "chip chip-on" : "chip"}
                  aria-current={s.id === chosen?.id ? "true" : undefined}
                >
                  {s.name}
                </Link>
              ))}
            </nav>

            {!chosen && (
              <section className="card section-panel">
                <h2 id="all-h">The whole trail</h2>
                <p className="panel-km">
                  {km1(doneKm)} <span>of {Math.round(totalKm)} km</span>
                  <strong>{Math.round((doneKm / totalKm) * 100)}%</strong>
                </p>
                {gap && (
                  <p className="muted">
                    Closest gap:{" "}
                    <Link href={`/map?s=${gap.sectionSlug}`} scroll={false}>
                      {gap.sectionName}, km {km1(gap.from)} to {km1(gap.to)}
                    </Link>
                    , shown in orange.
                  </p>
                )}
                <ul className="overview-list">
                  {info.map((s) => (
                    <li key={s.id}>
                      <Link
                        href={`/map?s=${s.slug}`}
                        scroll={false}
                        className="overview-row"
                      >
                        <Badge kind={s.slug} size={36} />
                        <span className="overview-name">{s.name}</span>
                        <span className="mono">
                          {km1(s.doneKm)} / {s.lengthKm} km
                        </span>
                        <span className="meter overview-meter">
                          <span
                            style={{
                              width: `${Math.min(100, (s.doneKm / s.lengthKm) * 100)}%`,
                            }}
                          />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <p className="hint">
                  Pick a section to see its gaps, facts and your hikes there.
                </p>
              </section>
            )}

            {chosen && sec && (
              <section className="card section-panel">
                <div className="panel-head">
                  <Badge kind={chosen.slug} size={80} />
                  <div>
                    <h2 id="sec-h">{chosen.name}</h2>
                    <p className="muted panel-sub">
                      {chosen.start_name} to {chosen.end_name}
                      {homeClubs.has(chosen.id) && (
                        <span className="tag tag-club">your club</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="panel-progress">
                  <p className="panel-km">
                    {km1(sec.doneKm)} <span>of {sec.lengthKm} km</span>
                    <strong>{pct}%</strong>
                  </p>
                  <div
                    className="km-bar"
                    role="img"
                    aria-label={
                      sec.covered.length
                        ? `Hiked: ${sec.covered.map(([a, b]) => `km ${km1(a)} to ${km1(b)}`).join(", ")}`
                        : "Nothing hiked here yet"
                    }
                  >
                    {bar.map((b) => (
                      <span
                        key={`${b.kind}-${b.from}`}
                        className={`km-${b.kind}`}
                        style={{
                          width: `${((b.to - b.from) / sec.lengthKm) * 100}%`,
                        }}
                      />
                    ))}
                  </div>
                  <div className="ends mono">
                    <span>km 0 · {chosen.start_name}</span>
                    <span>
                      {chosen.end_name} · km {sec.lengthKm}
                    </span>
                  </div>
                </div>

                <dl className="facts">
                  <dt>Runs</dt>
                  <dd>
                    {chosen.start_name} to {chosen.end_name} · {sec.lengthKm} km
                  </dd>
                  {chosen.sights && (
                    <>
                      <dt>Look out for</dt>
                      <dd>{chosen.sights}</dd>
                    </>
                  )}
                  <dt>Club</dt>
                  <dd>
                    {CLUBS[chosen.slug] ?? `${chosen.name} Bruce Trail Club`}
                    {chosen.club_badge_url && (
                      <>
                        {" · "}
                        <a
                          href={chosen.club_badge_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Badges
                          <span className="sr-only"> (opens in a new tab)</span>
                        </a>
                      </>
                    )}
                  </dd>
                </dl>

                <div>
                  <h3 className="panel-h">Gaps to fill</h3>
                  {sec.covered.length === 0 ? (
                    <p className="muted">
                      You haven&rsquo;t hiked here yet. The whole section is
                      open.
                    </p>
                  ) : gaps.length === 0 ? (
                    <p className="muted">
                      No gaps. You&rsquo;ve hiked the whole section.
                    </p>
                  ) : (
                    <ul className="gap-list">
                      {gaps.map((g) => (
                        <li key={g.from}>
                          <span className="gap-where">
                            {g.fromName && g.toName
                              ? `${g.fromName} to ${g.toName}`
                              : `km ${km1(g.from)} to ${km1(g.to)}`}
                          </span>
                          <span className="mono">{km1(g.to - g.from)} km</span>
                          {g.fromName && g.toName && (
                            <span className="mono muted">
                              km {km1(g.from)} to {km1(g.to)}
                            </span>
                          )}
                          {gapHere &&
                            Math.abs(g.from - gapHere.from) < 0.05 && (
                              <span className="gap-note">Closest gap</span>
                            )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <h3 className="panel-h">Your hikes here</h3>
                  {hikesHere.length === 0 ? (
                    <p className="muted">None yet.</p>
                  ) : (
                    <ul className="hikes hikes-compact">
                      {hikesHere.map((h) => (
                        <li key={`${h.id}-${h.km}`}>
                          <span className="mono muted">
                            {short(h.hiked_on).replace(/, \d{4}$/, "")}
                          </span>
                          <Link
                            href={`/hikes/${h.id}/edit`}
                            className="hike-name"
                          >
                            {h.name}
                          </Link>
                          <span className="mono">{km1(h.km)} km</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="actions">
                  {sec.covered.length > 0 && (
                    <Link href={`/log/${chosen.slug}`} className="primary">
                      View or download trail log
                    </Link>
                  )}
                  <Link
                    href={`/hikes/new?section=${chosen.id}`}
                    className="secondary"
                  >
                    Log a hike here
                  </Link>
                </div>
              </section>
            )}
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}
