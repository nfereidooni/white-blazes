import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/Logo";
import { Forest } from "@/components/Forest";
import { Footer } from "@/components/Footer";
import { Avatar } from "@/components/Avatar";
import { BadgeRing } from "@/components/Badge";
import { TrailMap } from "@/components/TrailMap";
import { avatarUrl } from "@/lib/avatar";
import { parseMulti } from "@/lib/gaps";
import { CLUBS } from "@/lib/trailLog";
import { Ribbon, totals, type SectionRow } from "@/components/TrailProgress";

type Row = { display_name: string | null; section_id: number; section_name: string; length_km: number; done_km: number };
type Facts = { id: number; slug: string; start_name: string; end_name: string; sights: string | null; club_badge_url: string };
type Shared = SectionRow & Omit<Facts, "id"> & { covered: [number, number][]; complete: boolean };

// A public page: no sign-in. Visitors can't read anyone's hikes. Three
// security definer functions hand back only what a share page shows, and
// only while sharing is on: km per section, covered stretches for the map,
// and the photo and goal if the owner chose to show them. Section facts are
// public anyway. cache() lets the page and its metadata share the calls.
const load = cache(async (slug: string) => {
  const supabase = await createClient();
  const [{ data }, { data: person }, { data: covered }, { data: facts }] = await Promise.all([
    supabase.rpc("shared_progress", { slug }),
    supabase.rpc("shared_profile", { slug }).maybeSingle<{ goal: string | null; avatar_path: string | null }>(),
    supabase.rpc("shared_covered", { slug }),
    supabase.from("sections").select("id, slug, start_name, end_name, sights, club_badge_url").order("id"),
  ]);
  const rows = (data ?? []) as Row[];
  if (!rows.length) return null;

  const coveredBy = new Map(((covered ?? []) as { section_id: number; covered: string }[]).map((c) => [c.section_id, parseMulti(c.covered)]));
  const factsBy = new Map(((facts ?? []) as Facts[]).map((f) => [f.id, f]));
  const sections: Shared[] = rows.map((r) => {
    const f = factsBy.get(r.section_id);
    const length = Number(r.length_km);
    const done = Number(r.done_km);
    return {
      id: r.section_id,
      name: r.section_name,
      length_km: length,
      done_km: done,
      slug: f?.slug ?? "",
      start_name: f?.start_name ?? "",
      end_name: f?.end_name ?? "",
      sights: f?.sights ?? null,
      club_badge_url: f?.club_badge_url ?? "",
      covered: coveredBy.get(r.section_id) ?? [],
      complete: done >= length * 0.995,
    };
  });
  return {
    name: rows[0].display_name ?? "A hiker",
    goal: person?.goal ?? null,
    photo: await avatarUrl(supabase, person?.avatar_path),
    sections,
  };
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const data = await load((await params).slug);
  if (!data) return { title: "White Blazes" };
  const { doneKm } = totals(data.sections);
  return {
    title: `${data.name} on the Bruce Trail · White Blazes`,
    description: `${data.name} has hiked ${doneKm.toFixed(1)} km of the Bruce Trail, from Niagara to Tobermory.`,
    robots: { index: false },
  };
}

const km1 = (n: number) => n.toFixed(1);

export default async function SharedProgressPage({ params }: { params: Promise<{ slug: string }> }) {
  const data = await load((await params).slug);
  if (!data) notFound();
  const { totalKm, doneKm, pct, started } = totals(data.sections);
  const complete = data.sections.filter((s) => s.complete);

  return (
    <div className="page">
      <header className="hero hero-tall">
        <Forest />
        <div className="bar">
          <Link href="/" className="logo-link" aria-label="White Blazes">
            <Logo />
          </Link>
        </div>
        <div className="hero-body">
          <div className="share-person">
            {data.photo && <Avatar url={data.photo} name={data.name} size={56} />}
            <p className="eyebrow">{data.name}&rsquo;s Bruce Trail</p>
          </div>
          <h1>
            {km1(doneKm)}
            <span> km</span>
          </h1>
          <p className="sub">
            of {Math.round(totalKm)} km · <strong>{pct}% of the Bruce Trail</strong> · {started} of 9 sections started
            {complete.length > 0 && (
              <>
                {" · "}
                <strong>
                  {complete.length} {complete.length === 1 ? "section" : "sections"} complete
                </strong>
              </>
            )}
          </p>
          {data.goal && (
            <p className="goal">
              Goal: <strong>{data.goal}</strong>
            </p>
          )}
        </div>
      </header>

      <main className="content">
        <section className="card" aria-labelledby="ribbon-h">
          <div className="card-head">
            <h2 id="ribbon-h">The whole trail</h2>
            <span className="mono">Niagara to Tobermory</span>
          </div>
          <Ribbon sections={data.sections} />
        </section>

        {complete.length > 0 && (
          <section className="card" aria-labelledby="done-h">
            <h2 id="done-h">Completed sections</h2>
            <ul className="done-row">
              {complete.map((s) => (
                <li key={s.id} className="done-card">
                  <BadgeRing kind={s.slug} fraction={1} size={96} />
                  <span className="badge-name">{s.name}</span>
                  <span className="mono badge-km">Section complete · {s.length_km} km</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="card map-card" aria-labelledby="map-h">
          <div className="card-head">
            <h2 id="map-h">Where {data.name} has hiked</h2>
            <div className="map-legend">
              <span><i className="key key-hiked" />Hiked</span>
              <span><i className="key key-not" />Not yet</span>
            </div>
          </div>
          <TrailMap
            sections={data.sections.map((s) => ({ id: s.id, slug: s.slug, lengthKm: s.length_km, covered: s.covered }))}
            selectedId={null}
            gap={null}
            interactive={false}
          />
          <p className="hint">Covered trail only, merged across hikes. No dates, routes or start points.</p>
        </section>

        <div className="columns">
          <section className="card" aria-labelledby="sections-h">
            <div>
              <h2 id="sections-h">The nine sections</h2>
              <p className="muted card-lede">Each section is looked after by its own volunteer club, south to north.</p>
            </div>
            <ul className="section-facts">
              {data.sections.map((s) => {
                const f = s.length_km ? s.done_km / s.length_km : 0;
                return (
                  <li key={s.id}>
                    <BadgeRing kind={s.slug} fraction={f} size={84} />
                    <div className="sf-body">
                      <div className="sf-head">
                        <h3>
                          {s.name}
                          {s.complete && <span className="tag tag-club">Section complete</span>}
                        </h3>
                        <span className="mono badge-km">
                          {s.complete ? `${s.length_km} km` : `${km1(s.done_km)} of ${s.length_km} km hiked · ${Math.round(f * 100)}%`}
                        </span>
                      </div>
                      <dl className="facts facts-plain">
                        <dt>Runs</dt>
                        <dd>
                          {s.start_name} to {s.end_name} · {s.length_km} km
                        </dd>
                        {s.sights && (
                          <>
                            <dt>Look out for</dt>
                            <dd>{s.sights}</dd>
                          </>
                        )}
                        <dt>Club</dt>
                        <dd>{CLUBS[s.slug] ?? `${s.name} Bruce Trail Club`}</dd>
                      </dl>
                      <div className="meter">
                        <div style={{ width: `${Math.min(100, f * 100)}%` }} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <div className="stack">
            <section className="card card-dark cta" aria-labelledby="join-h">
              <h2 id="join-h">Want to map your own journey?</h2>
              <p>White Blazes tracks your hikes along the Bruce Trail and shows how much of each section you&rsquo;ve covered.</p>
              <Link href="/login" className="button-light">
                Join White Blazes
              </Link>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
