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
    <PageShell title="Settings">
      <h2 className="settings-h">Profile</h2>
      <div className="settings-photo">
        <PhotoUpload userId={user.id} url={photo} name={name} />
      </div>
      <SettingsForm
        displayName={profile?.display_name ?? ""}
        goal={profile?.goal ?? ""}
        gapFillM={profile?.gap_fill_m ?? 300}
        shareProfile={profile?.share_profile ?? false}
        clubs={clubs}
        myClubs={(mine ?? []).map((r) => r.section_id as number)}
      />

      <h2 className="settings-h">Your data</h2>
      <p className="muted">Every hike you&rsquo;ve logged, with all its details, as a spreadsheet.</p>
      <div className="actions">
        <a href="/api/export" className="secondary">
          Download all my data (CSV)
        </a>
      </div>

      <div className="danger-zone">
        <h2 className="settings-h">Delete account</h2>
        <p className="muted">Signed in as {user.email}.</p>
        <DeleteAccount />
      </div>
    </PageShell>
  );
}
