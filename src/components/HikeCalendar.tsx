const LEVELS = ["#e3e9db", "#c3d9a5", "#8fb46a", "#4f7f50", "#24452f"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const iso = (d: Date) => d.toISOString().slice(0, 10);
const level = (km: number) => (km <= 0 ? 1 : km < 8 ? 1 : km < 12 ? 2 : km < 16 ? 3 : 4);

/**
 * One square per day, a column per week (Monday on top), from `from` to
 * `to` (YYYY-MM-DD). Darker squares are days with more km on the trail.
 */
export function HikeCalendar({ days, from, to }: { days: Map<string, number>; from: string; to: string }) {
  const end = new Date(`${to}T00:00:00Z`);
  const start = new Date(`${from}T00:00:00Z`);
  const shown = [...days.keys()].filter((d) => d >= from && d <= to).length;
  // Back up to the Monday on or before the start.
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));

  const cells: { date: string; km: number | undefined }[] = [];
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
    cells.push({ date: key, km: key < from ? undefined : days.get(key) });
  }

  return (
    <div className="calendar-scroll">
      <div className="calendar" style={{ minWidth: Math.max(560, col * 12) }}>
        <div className="calendar-months" style={{ gridTemplateColumns: `repeat(${col}, minmax(0, 1fr))` }} aria-hidden="true">
          {months.filter((m) => m.col <= col - 2).map((m) => (
            <span key={`${m.col}-${m.label}`} style={{ gridColumn: m.col }}>
              {m.label}
            </span>
          ))}
        </div>
        <div className="calendar-days" role="img" aria-label={`Hike calendar from ${from} to ${to}: ${shown} hiking ${shown === 1 ? "day" : "days"}`}>
          {cells.map((c) => (
            <span
              key={c.date}
              title={c.km === undefined ? c.date : `${c.date}: ${c.km.toFixed(1)} km`}
              style={{ background: LEVELS[c.km === undefined ? 0 : level(c.km)] }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function CalendarLegend() {
  return (
    <div className="calendar-legend" aria-hidden="true">
      <span>Fewer km</span>
      {LEVELS.map((c) => (
        <span key={c} className="swatch" style={{ background: c }} />
      ))}
      <span>More</span>
    </div>
  );
}
