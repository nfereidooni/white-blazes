import { createClient } from "@/lib/supabase/server";
import { PageShell } from "@/components/PageShell";
import { HikeForm } from "../HikeForm";
import { createHike } from "../actions";

export default async function NewHikePage() {
  const supabase = await createClient();
  const { data: sections } = await supabase.from("sections").select("id, name, length_km").order("id");

  return (
    <PageShell title="Log a hike">
      <HikeForm action={createHike} sections={sections ?? []} showPlacement submitLabel="Save hike" />
    </PageShell>
  );
}
