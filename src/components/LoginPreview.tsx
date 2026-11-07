import { totals, type SectionRow } from "@/components/TrailProgress";
import { TrailMap } from "@/components/TrailMap";
import { BadgeRing } from "@/components/Badge";

/**
 * What White Blazes looks like, for people who haven't signed in yet.
 * It uses the app's own map with an invented hiker, so it always
 * matches the real thing. Nothing here comes from the database.
 */
type Demo = SectionRow & { slug: string; covered: [number, number][] };

const RAW: Demo[] = [
  { id: 1, slug: "niagara", name: "Niagara", length_km: 83, covered: [[0, 83]], done_km: 0 },
  { id: 2, slug: "iroquoia", name: "Iroquoia", length_km: 122.5, covered: [[0, 122.5]], done_km: 0 },
  { id: 3, slug: "toronto", name: "Toronto", length_km: 50.3, covered: [[0, 21.4], [30.2, 44]], done_km: 0 },
  { id: 4, slug: "caledon", name: "Caledon Hills", length_km: 72.4, covered: [[12, 31.5]], done_km: 0 },
  { id: 5, slug: "dufferin", name: "Dufferin Hi-Land", length_km: 56.3, covered: [], done_km: 0 },
  { id: 6, slug: "blue", name: "Blue Mountains", length_km: 70, covered: [[40.5, 52]], done_km: 0 },
  { id: 7, slug: "beaver", name: "Beaver Valley", length_km: 120, covered: [], done_km: 0 },
  { id: 8, slug: "sydenham", name: "Sydenham", length_km: 170, covered: [], done_km: 0 },
  { id: 9, slug: "peninsula", name: "Peninsula", length_km: 160, covered: [[141, 160]], done_km: 0 },
];
const SECTIONS: Demo[] = RAW.map((s) => ({ ...s, done_km: s.covered.reduce((a, [x, y]) => a + y - x, 0) }));

// A few weeks of the calendar for the cut-out: 0 = no hike, 1 to 4 = shade.
const WEEKS = [
  [0, 0, 0, 0, 0, 2, 0],
  [0, 0, 0, 0, 0, 0, 3],
  [0, 0, 0, 0, 0, 1, 0],
  [0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 4, 2],
  [0, 0, 0, 0, 0, 0, 1],
  [0, 0, 0, 0, 0, 3, 0],
  [0, 0, 0, 0, 0, 2, 0],
  [0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 4, 0],
];

export function LoginPreview() {
  const { doneKm, pct } = totals(SECTIONS);
  const toronto = SECTIONS[2];
  return (
    <section className="preview" aria-label="Example of what White Blazes shows">
      <p className="preview-caption">
        <span className="tag tag-soon">Example</span> {doneKm.toFixed(0)} km hiked · {pct}% of the trail
      </p>
      <div className="preview-map" inert>
        <TrailMap
          sections={SECTIONS.map(({ id, slug, length_km, covered }) => ({ id, slug, lengthKm: length_km, covered }))}
          selectedId={null}
          gap={null}
          interactive={false}
        />
      </div>

      <div className="cutouts" aria-hidden="true">
        <div className="cutout cutout-badge wb-gold">
          <BadgeRing kind="niagara" fraction={1} size={52} status="received" />
          <div>
            <strong>Niagara</strong>
            <span>Badge earned</span>
          </div>
        </div>

        <div className="cutout cutout-section">
          <strong>{toronto.name}</strong>
          <span className="mono">
            {toronto.done_km.toFixed(1)} of {toronto.length_km} km
          </span>
          <div className="cutout-bar">
            {toronto.covered.map(([a, b]) => (
              <i key={a} style={{ left: `${(a / toronto.length_km) * 100}%`, width: `${((b - a) / toronto.length_km) * 100}%` }} />
            ))}
          </div>
        </div>

        <div className="cutout cutout-cal">
          <strong>Hiking days</strong>
          <div className="cutout-grid">
            {WEEKS.map((w, i) => (
              <div key={i}>
                {w.map((v, j) => (
                  <i key={j} className={v ? `l${v}` : undefined} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
