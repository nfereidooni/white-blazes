"use client";

import Link from "next/link";
import { useRef, useState } from "react";

const LEVELS = ["#e3e9db", "#c3d9a5", "#8fb46a", "#4f7f50", "#24452f"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export type DayHike = { id: string; name: string; newKm: number; walkedKm: number | null };
/** Hikes per day, keyed by YYYY-MM-DD. A plain object so it can cross from server to browser. */
export type CalendarDays = Record<string, DayHike[]>;

const iso = (d: Date) => d.toISOString().slice(0, 10);
const level = (km: number) => (km < 8 ? 1 : km < 12 ? 2 : km < 16 ? 3 : 4);
const longDate = (key: string) =>
  new Date(`${key}T12:00:00`).toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
const newTotal = (hikes: DayHike[]) => hikes.reduce((a, h) => a + h.newKm, 0);

type Tip = { key: string; hikes: DayHike[]; x: number; y: number };

/**
 * One square per day, a column per week (Monday on top), from `from` to
 * `to` (YYYY-MM-DD). Darker squares are days with more new km of trail.
 * Hover, focus or tap a square to see the day; days with a hike link to it.
 */
export function HikeCalendar({ days, from, to }: { days: CalendarDays; from: string; to: string }) {
  const [tip, setTip] = useState<Tip | null>(null);
  const grid = useRef<HTMLDivElement>(null);

  const end = new Date(`${to}T00:00:00Z`);
  const start = new Date(`${from}T00:00:00Z`);
  // Back up to the Monday on or before the start.
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));

  const cells: { key: string; hikes: DayHike[] | undefined; pad: boolean }[] = [];
  const months: { col: number; label: string }[] = [];
  let col = 0;
  let lastMonth = -1;
  for (let t = start.getTime(); t <= end.getTime(); t += 86400000) {
    const d = new Date(t);
    if ((d.getUTCDay() + 6) % 7 === 0) {
      col++;
      if (d.getUTCMonth() !== lastMonth) {
        lastMonth = d.getUTCMonth();
        // A month that starts within two weeks of the last label replaces it,
        // so labels never overlap.
        if (months.length && col - months[months.length - 1].col < 3) months.pop();
        months.push({ col, label: MONTHS[lastMonth] });
      }
    }
    const key = iso(d);
    // Days before the range (padding back to Monday) stay blank.
    cells.push({ key, hikes: key < from ? undefined : days[key], pad: key < from });
  }
  const hikingDays = cells.filter((c) => c.hikes?.length).length;

  // The tooltip is positioned against the viewport, so the scrolling box can't clip it.
  const show = (key: string, hikes: DayHike[], el: Element) => {
    const r = el.getBoundingClientRect();
    setTip({ key, hikes, x: r.left + r.width / 2, y: r.top });
  };

  return (
    <div className="calendar-scroll" onScroll={() => setTip(null)}>
      <div className="calendar" style={{ minWidth: Math.max(560, col * 12) }}>
        <div className="calendar-months" style={{ gridTemplateColumns: `repeat(${col}, minmax(0, 1fr))` }} aria-hidden="true">
          {months
            .filter((m) => m.col <= col - 2)
            .map((m) => (
              <span key={`${m.col}-${m.label}`} style={{ gridColumn: m.col }}>
                {m.label}
              </span>
            ))}
        </div>
        <p className="sr-only">
          Hike calendar from {longDate(from)} to {longDate(to)}: {hikingDays} hiking {hikingDays === 1 ? "day" : "days"}. Each
          hiking day below links to its hike.
        </p>
        <div className="calendar-days" ref={grid} onMouseLeave={() => setTip(null)}>
          {cells.map((c) => {
            if (c.pad) return <span key={c.key} aria-hidden="true" style={{ visibility: "hidden" }} />;
            const hikes = c.hikes ?? [];
            const bg = LEVELS[hikes.length ? level(newTotal(hikes)) : 0];
            if (!hikes.length) {
              return <span key={c.key} aria-hidden="true" style={{ background: bg }} onMouseEnter={(e) => show(c.key, [], e.currentTarget)} />;
            }
            const label = `${longDate(c.key)}: ${hikes.map((h) => h.name).join(", ")}, ${newTotal(hikes).toFixed(1)} km of new trail`;
            return (
              <Link
                key={c.key}
                href={`/hikes/${hikes[0].id}/edit`}
                aria-label={label}
                className="calendar-hike"
                style={{ background: bg }}
                onMouseEnter={(e) => show(c.key, hikes, e.currentTarget)}
                onFocus={(e) => show(c.key, hikes, e.currentTarget)}
                onBlur={() => setTip(null)}
                onClick={(e) => {
                  // On a touch screen, the first tap shows the day; a second tap opens the hike.
                  if (window.matchMedia("(hover: none)").matches && tip?.key !== c.key) {
                    e.preventDefault();
                    show(c.key, hikes, e.currentTarget);
                  }
                }}
              />
            );
          })}
        </div>
      </div>

      {tip && (
        <div className="calendar-tip" role="tooltip" style={{ left: tip.x, top: tip.y }}>
          {tip.hikes.length ? (
            <>
              <strong>{newTotal(tip.hikes) > 0 ? `${newTotal(tip.hikes).toFixed(1)} km of new trail` : "No new trail"}</strong>
              {tip.hikes.map((h) => (
                <span key={h.id} className="tip-hike">
                  {h.name}
                  {h.walkedKm != null && <span className="tip-km">{h.walkedKm.toFixed(1)} km walked</span>}
                </span>
              ))}
            </>
          ) : (
            <strong>No hikes</strong>
          )}
          <span className="tip-date">{longDate(tip.key)}</span>
        </div>
      )}
    </div>
  );
}

export function CalendarLegend() {
  return (
    <div className="calendar-legend" aria-hidden="true">
      <span>Less new trail</span>
      {LEVELS.map((c) => (
        <span key={c} className="swatch" style={{ background: c }} />
      ))}
      <span>More</span>
    </div>
  );
}
