import Link from "next/link";

/** Shown on the home page until the first hike. Three ways in; pick any one. */
export function GetStarted() {
  return (
    <section className="card get-started" aria-labelledby="start-h">
      <div>
        <h2 id="start-h">Get started</h2>
        <p className="muted card-lede">
          Add the hikes you&rsquo;ve done on the Bruce Trail. White Blazes works
          out which stretches you&rsquo;ve covered and fills in your sections,
          map and badges. Pick whichever way suits you.
        </p>
      </div>
      <ul className="start-steps">
        <li>
          <h3>Import from Strava</h3>
          <p>
            On strava.com, go to Settings, then My Account, then{" "}
            <em>Download or Delete Your Account</em>, and request your archive.
            Strava emails you a zip. Upload it here and White Blazes picks out
            the hikes that were on the Bruce Trail.
          </p>
          <Link href="/hikes/import?from=strava">Import a Strava archive</Link>
        </li>
        <li>
          <h3>Import a GPX file</h3>
          <p>
            Export a single hike as GPX from AllTrails, Gaia, Garmin or your
            watch&rsquo;s app, then upload it.
          </p>
          <Link href="/hikes/import">Import a GPX file</Link>
        </li>
        <li>
          <h3>Log a hike by hand</h3>
          <p>
            No track? Add the date, then mark where you started and finished on
            a map, or enter the km from your guidebook.
          </p>
          <Link href="/hikes/new">Log a hike</Link>
        </li>
      </ul>
      <p className="hint">
        Files are read on your device. Only hikes on the trail are saved.
      </p>
    </section>
  );
}
