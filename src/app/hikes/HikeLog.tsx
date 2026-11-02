"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/Badge";

export type LogHike = {
  id: string;
  date: string;
  name: string;
  walkedKm: number | null;
  newKm: number;
  trail: "main" | "side";
  placed: boolean;
  club: boolean;
  source: string;
  badge: string | null;
  sections: string;
  search: string;
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "club", label: "Club hikes" },
  { key: "own", label: "On my own" },
  { key: "side", label: "Side trails" },
  { key: "unplaced", label: "Needs placing" },
] as const;
type Filter = (typeof FILTERS)[number]["key"];

const SOURCE: Record<string, string> = { strava: "Strava", gpx: "GPX file", manual: "Logged by hand", club_export: "Club export" };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const short = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}`;

const matches = (h: LogHike, f: Filter) =>
  f === "all" ||
  (f === "club" && h.club) ||
  (f === "own" && !h.club) ||
  (f === "side" && h.trail === "side") ||
  (f === "unplaced" && h.trail === "main" && !h.placed);

/**
 * Your hike log, grouped by year. Search and filters run in the browser:
 * the page already has every hike, so there's no need to ask the server
 * again for each keystroke.
 */
export function HikeLog({ hikes }: { hikes: LogHike[] }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const shown = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return hikes.filter((h) => matches(h, filter) && words.every((w) => h.search.includes(w)));
  }, [hikes, q, filter]);

  const years = useMemo(() => {
    const out = new Map<string, LogHike[]>();
    for (const h of shown) out.set(h.date.slice(0, 4), [...(out.get(h.date.slice(0, 4)) ?? []), h]);
    return [...out.entries()];
  }, [shown]);

  const count = (f: Filter) => hikes.filter((h) => matches(h, f)).length;

  return (
    <>
      <div className="log-tools">
        <label htmlFor="hike-search" className="sr-only">
          Search hikes
        </label>
        <input id="hike-search" type="search" className="search" placeholder="Search hikes" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="filter-chips" role="group" aria-label="Show">
          {FILTERS.map((f) => (
            <button key={f.key} type="button" className={filter === f.key ? "chip chip-on" : "chip"} aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
              {f.label}
              {f.key !== "all" && <span className="chip-count">{count(f.key)}</span>}
            </button>
          ))}
        </div>
      </div>

      <p className="sr-only" role="status">
        {shown.length} {shown.length === 1 ? "hike" : "hikes"} shown
      </p>

      {shown.length === 0 ? (
        <p className="muted">{hikes.length ? "No hikes match." : "No hikes yet. Log your first one."}</p>
      ) : (
        years.map(([year, list]) => {
          const walked = list.reduce((a, h) => a + (h.walkedKm ?? 0), 0);
          const fresh = list.reduce((a, h) => a + h.newKm, 0);
          return (
            <section key={year} className="year-group" aria-labelledby={`y-${year}`}>
              <div className="year-head">
                <h3 id={`y-${year}`}>{year}</h3>
                <span className="mono muted">
                  {list.length} {list.length === 1 ? "hike" : "hikes"} · {Math.round(walked)} km walked · {Math.round(fresh)} km new
                </span>
              </div>
              <ul className="log-rows">
                {list.map((h) => (
                  <li key={h.id}>
                    <Link href={`/hikes/${h.id}/edit`} className="log-row">
                      <span className="mono muted log-date">{short(h.date)}</span>
                      {h.badge ? <Badge kind={h.badge} size={36} /> : <span className="badge-none" aria-hidden="true" />}
                      <span className="log-main">
                        <span className="log-name">
                          {h.name}
                          {h.trail === "side" && <span className="tag">side trail</span>}
                          {h.trail === "main" && !h.placed && <span className="tag tag-needs">needs placing</span>}
                        </span>
                        <span className="log-meta">
                          {h.sections} · {h.club ? "Club hike" : "On my own"} · {SOURCE[h.source] ?? h.source}
                        </span>
                      </span>
                      <span className="mono log-walked">{h.walkedKm != null ? `${h.walkedKm.toFixed(1)} km` : ""}</span>
                      <span className={h.newKm > 0 ? "mono log-new" : "mono log-new muted"}>
                        {h.newKm > 0 ? `+${h.newKm.toFixed(1)} new` : h.trail === "main" && h.placed ? "no new km" : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
      <p className="hint">
        Walked is the full distance. New is main trail you hadn&rsquo;t hiked before, counted in date order.
      </p>
    </>
  );
}
