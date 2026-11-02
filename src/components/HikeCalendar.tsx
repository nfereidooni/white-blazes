const LEVELS = ["#e3e9db", "#c3d9a5", "#8fb46a", "#4f7f50", "#24452f"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const iso = (d: Date) => d.toISOString().slice(0, 10);
const level = (km: number) => (km <= 0 ? 1 : km < 8 ? 1 : km < 12 ? 2 : km < 16 ? 3 : 4);

/**
 * One square per day, a column per week (Monday on top), from the month of
 * your first hike to today. Darker squares are days with more km on the
 * trail. Capped at two years so it stays readable.
 */
export function HikeCalendar({ days, today }: { days: Map<string, number>; today: string }) {
  const dates = [...days.keys()].sort();
  if (!dates.length) return <p className="muted">Your hikes will show up here, one square per day.</p>;

  const end = new Date(`${today}T00:00:00Z`);
  const earliest = new Date(`${dates[0].slice(0, 7)}-01T00:00:00Z`);
  const cap = new Date(end.getTime() - 104 * 7 * 86400000);
  const start = earliest < cap ? cap : earliest;
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
    cells.push({ date: key, km: days.get(key) });
  }

  return (
    <div className="calendar-scroll">
      <div className="calendar" style={{ minWidth: Math.max(560, col * 13) }}>
        <div className="calendar-months" style={{ gridTemplateColumns: `repeat(${col}, minmax(0, 1fr))` }} aria-hidden="true">
          {months.filter((m) => m.col <= col - 2).map((m) => (
            <span key={`${m.col}-${m.label}`} style={{ gridColumn: m.col }}>
              {m.label}
            </span>
          ))}
        </div>
        <div className="calendar-days" role="img" aria-label={`Hike calendar: ${dates.length} hiking days since ${dates[0]}`}>
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
