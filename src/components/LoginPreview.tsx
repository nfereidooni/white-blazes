import { totals, type SectionRow } from "@/components/TrailProgress";
import { TrailMap } from "@/components/TrailMap";

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

export function LoginPreview() {
  const { totalKm, doneKm, pct } = totals(SECTIONS);
  return (
    <section className="preview" aria-label="Example of what White Blazes shows">
      <div className="preview-head">
        <span className="tag tag-soon">Example hiker</span>
        <p className="preview-figure">
          <strong>{doneKm.toFixed(1)}</strong> of {Math.round(totalKm)} km · {pct}% of the trail
        </p>
      </div>
      <TrailMap
        sections={SECTIONS.map(({ id, slug, length_km, covered }) => ({ id, slug, lengthKm: length_km, covered }))}
        selectedId={null}
        gap={null}
        interactive={false}
      />
      <div className="map-legend">
        <span>
          <i className="key key-hiked" />
          Hiked
        </span>
        <span>
          <i className="key key-not" />
          Not yet
        </span>
        <span className="preview-note">Every stretch you&rsquo;ve hiked, Niagara to Tobermory</span>
      </div>
    </section>
  );
}
