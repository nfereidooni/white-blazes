import Link from "next/link";
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

/**
 * The nine sections end to end, south to north, each block as wide as the
 * section is long. Green marks the stretches actually hiked, in place, so a
 * hike in the middle of a section shows in the middle. Without `covered`
 * it falls back to a bar filled from the left.
 */
export function Ribbon({
  sections,
  linkToMap = false,
}: {
  sections: (SectionRow & { slug?: string; covered?: [number, number][] })[];
  linkToMap?: boolean;
}) {
  return (
    <>
      <div className="ribbon">
        {sections.map((s) => {
          const pct = Math.round((s.done_km / s.length_km) * 100);
          const label = `${s.name}: ${s.done_km.toFixed(1)} of ${s.length_km} km hiked (${pct}%)`;
          const fill = s.covered ? (
            s.covered.map(([a, b], i) => (
              <i
                key={i}
                style={{ left: `${(a / s.length_km) * 100}%`, width: `${((b - a) / s.length_km) * 100}%` }}
              />
            ))
          ) : (
            <i style={{ left: 0, width: `${Math.min(100, pct)}%` }} />
          );
          const style = { flex: `${s.length_km} 1 0` };
          return linkToMap && s.slug ? (
            <Link key={s.id} href={`/map?s=${s.slug}`} className="ribbon-block" style={style} title={label} aria-label={label}>
              {fill}
            </Link>
          ) : (
            <div key={s.id} className="ribbon-block" style={style} title={label} role="img" aria-label={label}>
              {fill}
            </div>
          );
        })}
      </div>
      <div className="ribbon-names" aria-hidden="true">
        {sections.map((s) => (
          <span key={s.id} style={{ flex: `${s.length_km} 1 0` }}>
            {s.name}
          </span>
        ))}
      </div>
      <div className="ends mono ribbon-ends">
        <span>Niagara Falls</span>
        <span>Tobermory</span>
      </div>
      <div className="ribbon-key">
        <span><i className="key key-hiked" />Hiked</span>
        <span><i className="key key-not" />Not yet</span>
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
