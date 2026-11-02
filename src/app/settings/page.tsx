import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageShell } from "@/components/PageShell";
import { SettingsForm } from "./SettingsForm";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("display_name, gap_fill_m").single();

  return (
    <PageShell title="Settings">
      <SettingsForm displayName={profile?.display_name ?? ""} gapFillM={profile?.gap_fill_m ?? 300} />
    </PageShell>
  );
}
