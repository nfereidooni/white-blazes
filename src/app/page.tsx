import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/Logo";

type Section = { id: number; slug: string; name: string; length_km: number; club_badge_url: string };
type Progress = { section_id: number; done_km: number };
type Hike = { id: string; hiked_on: string; name: string; walked_km: number | null };

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
  const [sectionsRes, progressRes, profileRes, hikesRes] = await Promise.all([
    supabase.from("sections").select("id, slug, name, length_km, club_badge_url").order("id"),
    supabase.from("section_progress").select("section_id, done_km"),
    supabase.from("profiles").select("display_name").single(),
    supabase.from("hikes").select("id, hiked_on, name, walked_km").order("hiked_on", { ascending: false }),
  ]);

  const sections = (sectionsRes.data ?? []) as Section[];
  const progress = new Map(((progressRes.data ?? []) as Progress[]).map((p) => [p.section_id, Number(p.done_km)]));
  const hikes = (hikesRes.data ?? []) as Hike[];
  const name = profileRes.data?.display_name ?? user.email;

  const totalKm = sections.reduce((a, s) => a + Number(s.length_km), 0);
  const doneKm = sections.reduce((a, s) => a + (progress.get(s.id) ?? 0), 0);
  const pct = totalKm ? Math.round((doneKm / totalKm) * 100) : 0;
  const started = sections.filter((s) => (progress.get(s.id) ?? 0) > 0).length;

  return (
    <div className="page">
      <header className="hero">
        <div className="bar">
          <Logo />
          <form action="/auth/signout" method="post" className="account">
            <span>{name}</span>
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
        </div>
      </header>

      <main className="content">
        <section className="card" aria-labelledby="ribbon-h">
          <div className="card-head">
            <h2 id="ribbon-h">The whole trail</h2>
            <span className="mono">9 sections · {Math.round(totalKm)} km</span>
          </div>
          <div className="ribbon">
            {sections.map((s) => (
              <div key={s.id} title={s.name} style={{ flex: `${s.length_km} 1 0` }}>
                <div style={{ width: `${Math.min(100, ((progress.get(s.id) ?? 0) / s.length_km) * 100)}%` }} />
              </div>
            ))}
          </div>
          <div className="ends mono">
            <span>Niagara</span>
            <span>Tobermory</span>
          </div>
        </section>

        <div className="columns">
          <section className="card" aria-labelledby="sections-h">
            <h2 id="sections-h">Sections</h2>
            <ul className="sections">
              {sections.map((s) => {
                const done = progress.get(s.id) ?? 0;
                const f = Math.min(1, done / s.length_km);
                return (
                  <li key={s.id}>
                    <div className="row">
                      <span className="name">{s.name}</span>
                      <span className="mono">
                        {done.toFixed(1)} of {Number(s.length_km)} km · {Math.round(f * 100)}%
                      </span>
                    </div>
                    <div className="meter">
                      <div style={{ width: `${f * 100}%` }} />
                    </div>
                    <a href={s.club_badge_url}>{s.name} club badges</a>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="card" aria-labelledby="hikes-h">
            <h2 id="hikes-h">Your hikes</h2>
            {hikes.length === 0 ? (
              <p className="muted">No hikes yet. Importing comes in a later stage.</p>
            ) : (
              <ul className="hikes">
                {hikes.map((h) => (
                  <li key={h.id}>
                    <span className="mono muted">{fmtDate(h.hiked_on)}</span>
                    <span>{h.name}</span>
                    <span className="mono">{h.walked_km != null ? `${Number(h.walked_km).toFixed(1)} km` : "?"}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
