import { createClient } from "@/lib/supabase/server";
import { setStravaSyncList } from "./actions-sync";

// Sync needs Strava's approval to work for more than 10 people, so the note
// gives no date. The button records interest on your profile; nothing else
// is collected, since we already have your email from sign-in.
export async function StravaSyncNote({ failed = false }: { failed?: boolean }) {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("wants_strava_sync").maybeSingle();
  const onList = !!data?.wants_strava_sync;

  return (
    <section className="soon-card" aria-labelledby="sync-h">
      <h2 id="sync-h">
        Strava sync <span className="tag tag-soon">Coming soon</span>
      </h2>
      <p>
        Soon, hikes you record on Strava will show up here on their own. Strava has to approve White Blazes before we
        can turn this on for everyone, so we can&rsquo;t promise a date yet.
      </p>
      <p>
        For now, import your Strava archive to bring in all your past hikes at once. Do it again any time to add new
        ones.
      </p>
      {failed && (
        <p className="error" role="alert">
          That didn&rsquo;t save. Try again in a moment.
        </p>
      )}
      <form action={setStravaSyncList} className="sync-list">
        <input type="hidden" name="on" value={onList ? "false" : "true"} />
        {onList ? (
          <p role="status">
            <strong>You&rsquo;re on the list.</strong> We&rsquo;ll email you once, when sync is ready.{" "}
            <button type="submit" className="link-button">
              Leave the list
            </button>
          </p>
        ) : (
          <button type="submit" className="secondary">
            Tell me when it&rsquo;s ready
          </button>
        )}
      </form>
    </section>
  );
}
