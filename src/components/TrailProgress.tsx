/**
 * The whole-trail ribbon and progress totals. Used on the home page and on
 * public share pages, so it only takes plain numbers.
 */
export type SectionRow = {
  id: number;
  name: string;
  length_km: number;
  club_badge_url?: string;
  /** Link to this section's trail log, when there's anything to log. */
  logHref?: string;
  /** One of the clubs this person belongs to. */
  homeClub?: boolean;
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
