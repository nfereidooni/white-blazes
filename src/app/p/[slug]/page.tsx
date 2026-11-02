import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";
import { Ribbon, SectionList, totals, type SectionRow } from "@/components/TrailProgress";

type Row = { display_name: string | null; section_id: number; section_name: string; length_km: number; done_km: number };

// A public page: no sign-in. Visitors can't read any table directly. The
// shared_progress function returns totals only, and only while sharing is on.
// cache() lets the page and its metadata share one database call.
const load = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("shared_progress", { slug });
  const rows = (data ?? []) as Row[];
  if (!rows.length) return null;
  const sections: SectionRow[] = rows.map((r) => ({
    id: r.section_id,
    name: r.section_name,
    length_km: Number(r.length_km),
    done_km: Number(r.done_km),
  }));
  return { name: rows[0].display_name ?? "A hiker", sections };
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const data = await load((await params).slug);
  if (!data) return { title: "White Blazes" };
  const { doneKm } = totals(data.sections);
  return {
    title: `${data.name} on the Bruce Trail · White Blazes`,
    description: `${data.name} has hiked ${doneKm.toFixed(1)} km of the Bruce Trail, Niagara to Tobermory.`,
    robots: { index: false },
  };
}

export default async function SharedProgressPage({ params }: { params: Promise<{ slug: string }> }) {
  const data = await load((await params).slug);
  if (!data) notFound();
  const { totalKm, doneKm, pct, started } = totals(data.sections);

  return (
    <div className="page">
      <header className="hero">
        <div className="bar">
          <Link href="/" className="logo-link" aria-label="White Blazes home">
            <Logo />
          </Link>
        </div>
        <div className="hero-body">
          <p className="eyebrow">{data.name}&rsquo;s Bruce Trail</p>
          <h1>
            {doneKm.toFixed(1)}
            <span> km</span>
          </h1>
          <p className="sub">
            of {Math.round(totalKm)} km · <strong>{pct}% of the Bruce Trail</strong> · {started} of 9 sections started
          </p>
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

        <div className="columns">
          <section className="card" aria-labelledby="sections-h">
            <h2 id="sections-h">Sections</h2>
            <SectionList sections={data.sections} />
          </section>

          <section className="card cta" aria-labelledby="join-h">
            <h2 id="join-h">Want to map your own journey?</h2>
            <p>
              White Blazes tracks your hikes on the Bruce Trail and shows how much of each section you&rsquo;ve covered.
            </p>
            <Link href="/login" className="button-light">
              Join White Blazes
            </Link>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
