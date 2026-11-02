import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTrailLog } from "@/lib/trailLog";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";
import { PrintButton } from "./PrintButton";

const fmtDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
const km = (n: number) => n.toFixed(1);

export default async function TrailLogPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const log = await getTrailLog(supabase, slug);
  if (!log) notFound();
  const { section, rows, gaps, unplaced } = log;
  const pct = Math.round((log.doneKm / section.lengthKm) * 100);
  const today = new Date().toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="page">
      <header className="hero hero-slim no-print">
        <div className="bar">
          <Link href="/" className="logo-link" aria-label="White Blazes home">
            <Logo />
          </Link>
        </div>
      </header>

      <main className="content trail-log">
        <section className="card">
          <div className="log-head">
            <div>
              <p className="eyebrow-dark">{section.club}</p>
              <h1 className="card-title">{section.name} trail log</h1>
              <p className="muted">
                {log.hiker} · {km(log.doneKm)} of {section.lengthKm} km · {pct}%
              </p>
            </div>
            <div className="actions no-print">
              <PrintButton />
              <a href={`/log/${section.slug}/csv`} className="secondary" download>
                Download spreadsheet (.csv)
              </a>
            </div>
          </div>

          {log.error && (
            <p className="error" role="alert">
              Your hikes couldn&rsquo;t be loaded: {log.error}. If you&rsquo;ve just pulled new code, run{" "}
              <code>npm run db:reset</code> to bring your database up to date.
            </p>
          )}

          {log.error ? null : rows.length === 0 ? (
            <p className="muted">No placed hikes in {section.name} yet.</p>
          ) : (
            <div className="table-wrap">
              <table className="log-table">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Hike</th>
                    <th scope="col">From</th>
                    <th scope="col">To</th>
                    <th scope="col" className="num">Km on trail</th>
                    <th scope="col">Club hike</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={`${r.hikeId}-${r.from}`}>
                      <td className="nowrap">{fmtDate(r.date)}</td>
                      <td>
                        {r.name}
                        {r.clubLink && (
                          <>
                            {" "}
                            <a href={r.clubLink} target="_blank" rel="noopener noreferrer" className="no-print">
                              listing<span className="sr-only"> (opens in a new tab)</span>
                            </a>
                          </>
                        )}
                      </td>
                      <td>
                        {r.startPoint}
                        <span className="km-note">km {km(r.from)}</span>
                      </td>
                      <td>
                        {r.endPoint}
                        <span className="km-note">km {km(r.to)}</span>
                      </td>
                      <td className="num">{km(r.to - r.from)}</td>
                      <td>{r.isClubHike ? (r.leader ? `Yes, led by ${r.leader}` : "Yes") : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="log-cols">
            <div>
              <h2>Still to hike</h2>
              {gaps.length === 0 ? (
                <p>The whole section is covered.</p>
              ) : (
                <ul>
                  {gaps.map((g) => (
                    <li key={g.from}>
                      km {km(g.from)} to {km(g.to)} <span className="muted">({km(g.to - g.from)} km)</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {unplaced.length > 0 && (
              <div className="no-print">
                <h2>Not placed yet</h2>
                <ul>
                  {unplaced.map((h) => (
                    <li key={h.id}>
                      <Link href={`/hikes/${h.id}/edit`}>{h.name}</Link> <span className="muted">{fmtDate(h.date)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <p className="fineprint">
            Km are measured along the main trail from the south end of the {section.name} section, using the
            OpenStreetMap trail line (October 2026) scaled to the official {section.lengthKm} km.
            {log.gapFillM > 0 && ` Breaks under ${log.gapFillM} m between hiked stretches are counted as hiked.`} Made with
            White Blazes on {today}. Badges are ordered through the {section.club}.
          </p>
        </section>
      </main>
      <div className="no-print">
        <Footer />
      </div>
    </div>
  );
}
