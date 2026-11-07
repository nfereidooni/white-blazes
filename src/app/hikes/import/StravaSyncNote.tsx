// Sync needs Strava's approval to work for more than 10 people, so the page
// says so plainly instead of promising a date.
export function StravaSyncNote() {
  return (
    <section className="soon-card" aria-labelledby="sync-h">
      <h2 id="sync-h">
        Strava sync <span className="tag tag-soon">Coming soon</span>
      </h2>
      <p>
        Sync would add each new hike as you record it, with no zip to download. Strava reviews every app that connects
        to it, and until an app is approved, sync only works for 10 people. White Blazes will apply once sync is built,
        and it goes live when Strava says yes.
      </p>
      <p>Until then, the Strava archive import brings in all your past hikes in one go.</p>
    </section>
  );
}
