import { Ribbon, totals, type SectionRow } from "@/components/TrailProgress";
import { BadgeRing } from "@/components/Badge";
import { HikeCalendar, type CalendarDays } from "@/components/HikeCalendar";

/**
 * What White Blazes looks like, for people who haven't signed in yet.
 * It uses the app's own components with an invented hiker, so it always
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

const NAMES = [
  "Dundas Valley loop",
  "Queenston to St. Davids",
  "Mount Nemo",
  "Rattlesnake Point",
  "Short Hills",
  "Cheltenham Badlands",
  "Kelso to Hilton Falls",
  "Grimsby escarpment",
  "Devil's Punch Bowl",
  "Websters Falls",
  "Crawford Lake",
  "Limehouse",
];

/** About 20 weekend hikes over the last six months, dated from today so it never looks stale. */
function demoDays(today: Date): CalendarDays {
  const days: CalendarDays = {};
  // The most recent Saturday before today.
  const sat = new Date(today);
  sat.setUTCDate(sat.getUTCDate() - ((sat.getUTCDay() + 1) % 7 || 7));
  for (let i = 0; i < 26; i++) {
    if (i % 4 === 3 || i % 7 === 5) continue; // some weekends off
    const d = new Date(sat);
    d.setUTCDate(d.getUTCDate() - i * 7 - (i % 3 === 1 ? 6 : 0)); // Saturdays, some Sundays
    const km = 6 + ((i * 7) % 13);
    days[d.toISOString().slice(0, 10)] = [
      { id: `demo-${i}`, name: NAMES[i % NAMES.length], newKm: i % 5 === 2 ? 0 : km, walkedKm: km + 1.5 },
    ];
  }
  return days;
}

export function LoginPreview() {
  const today = new Date();
  const to = today.toISOString().slice(0, 10);
  const fromDate = new Date(today);
  fromDate.setUTCMonth(fromDate.getUTCMonth() - 6);
  const { totalKm, doneKm, pct } = totals(SECTIONS);

  return (
    <section className="preview" aria-label="Example of what White Blazes shows">
      <div className="preview-head">
        <span className="tag tag-soon">Example hiker</span>
        <p className="preview-figure">
          <strong>{doneKm.toFixed(1)}</strong> of {Math.round(totalKm)} km · {pct}% of the trail
        </p>
      </div>

      <div className="preview-block preview-ribbon">
        <h2>Every stretch you&rsquo;ve hiked, end to end</h2>
        <Ribbon sections={SECTIONS} />
      </div>

      <div className="preview-block preview-cal" inert>
        <h2>Your hiking days</h2>
        <HikeCalendar days={demoDays(today)} from={fromDate.toISOString().slice(0, 10)} to={to} />
      </div>

      <div className="preview-block">
        <h2>Section badges</h2>
        <ul className="preview-badges">
          <li className="badge-card wb-gold">
            <BadgeRing kind="niagara" fraction={1} size={72} status="received" />
            <span className="badge-name">Niagara</span>
            <span className="badge-earned">Badge earned</span>
          </li>
          <li className="badge-card badge-complete">
            <BadgeRing kind="iroquoia" fraction={1} size={72} status="complete" />
            <span className="badge-name">Iroquoia</span>
            <span className="mono badge-km">Complete</span>
          </li>
          <li className="badge-card">
            <BadgeRing kind="toronto" fraction={35.2 / 50.3} size={72} status="progress" />
            <span className="badge-name">Toronto</span>
            <span className="mono badge-km">70%</span>
          </li>
        </ul>
      </div>
    </section>
  );
}
