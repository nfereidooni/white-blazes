/**
 * The whole-trail ribbon and the per-section list. Used on the home page and
 * on public share pages, so it only takes plain numbers.
 */
export type SectionRow = {
  id: number;
  name: string;
  length_km: number;
  club_badge_url?: string;
  done_km: number;
};

export function Ribbon({ sections }: { sections: SectionRow[] }) {
  return (
    <>
      <div className="ribbon">
        {sections.map((s) => (
          <div key={s.id} title={s.name} style={{ flex: `${s.length_km} 1 0` }}>
            <div style={{ width: `${Math.min(100, (s.done_km / s.length_km) * 100)}%` }} />
          </div>
        ))}
      </div>
      <div className="ends mono">
        <span>Niagara</span>
        <span>Tobermory</span>
      </div>
    </>
  );
}

export function SectionList({ sections }: { sections: SectionRow[] }) {
  return (
    <ul className="sections">
      {sections.map((s) => {
        const f = Math.min(1, s.done_km / s.length_km);
        return (
          <li key={s.id}>
            <div className="row">
              <span className="name">{s.name}</span>
              <span className="mono">
                {s.done_km.toFixed(1)} of {Number(s.length_km)} km · {Math.round(f * 100)}%
              </span>
            </div>
            <div className="meter">
              <div style={{ width: `${f * 100}%` }} />
            </div>
            {s.club_badge_url && (
              <a href={s.club_badge_url} target="_blank" rel="noopener noreferrer">
                {s.name} club badges<span className="sr-only"> (opens in a new tab)</span>
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function totals(sections: SectionRow[]) {
  const totalKm = sections.reduce((a, s) => a + Number(s.length_km), 0);
  const doneKm = sections.reduce((a, s) => a + s.done_km, 0);
  return {
    totalKm,
    doneKm,
    pct: totalKm ? Math.round((doneKm / totalKm) * 100) : 0,
    started: sections.filter((s) => s.done_km > 0).length,
  };
}
