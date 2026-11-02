import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { avatarUrl } from "@/lib/avatar";
import { CLUBS } from "@/lib/trailLog";
import { PageShell } from "@/components/PageShell";
import { SettingsForm } from "./SettingsForm";
import { PhotoUpload } from "./PhotoUpload";
import { DeleteAccount } from "./DeleteAccount";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: sections }, { data: mine }] = await Promise.all([
    supabase.from("profiles").select("display_name, goal, gap_fill_m, share_profile, avatar_path").single(),
    supabase.from("sections").select("id, slug, name").order("id"),
    supabase.from("profile_clubs").select("section_id"),
  ]);
  const name = profile?.display_name ?? user.email ?? "";
  const photo = await avatarUrl(supabase, profile?.avatar_path);
  const clubs = (sections ?? []).map((s) => ({ id: s.id as number, name: CLUBS[s.slug as string] ?? `${s.name} Bruce Trail Club` }));

  return (
    <PageShell title="Settings" eyebrow={user.email} bare>
      <SettingsForm
        photo={<PhotoUpload userId={user.id} url={photo} name={name} />}
        displayName={profile?.display_name ?? ""}
        goal={profile?.goal ?? ""}
        gapFillM={profile?.gap_fill_m ?? 300}
        shareProfile={profile?.share_profile ?? false}
        clubs={clubs}
        myClubs={(mine ?? []).map((r) => r.section_id as number)}
      />

      <section className="card" aria-labelledby="data-h">
        <h2 id="data-h">Your data</h2>
        <p className="muted">Every hike you&rsquo;ve logged, with all its details and where it&rsquo;s placed on the trail, as a spreadsheet.</p>
        <div className="actions">
          <a href="/api/export" className="secondary" download>
            Download all my data (CSV)
          </a>
        </div>
      </section>

      <section className="card card-danger" aria-labelledby="delete-h">
        <h2 id="delete-h">Delete account</h2>
        <p className="muted">Signed in as {user.email}.</p>
        <DeleteAccount />
      </section>

      <form action="/auth/signout" method="post" className="signout-form">
        <button type="submit" className="link-button">
          Sign out
        </button>
      </form>
    </PageShell>
  );
}
