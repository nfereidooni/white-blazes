import { createClient } from "@/lib/supabase/server";
import { PageShell } from "@/components/PageShell";
import { HikeForm } from "../HikeForm";
import { createHike } from "../actions";

export default async function NewHikePage({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  const { section } = await searchParams;
  const supabase = await createClient();
  const { data: sections } = await supabase.from("sections").select("id, name, length_km").order("id");

  return (
    <PageShell title="Log a hike" eyebrow="Hike log" tab="hikes">
      <HikeForm
        action={createHike}
        sections={sections ?? []}
        initial={section && /^\d+$/.test(section) ? { section_id: Number(section) } : undefined}
        showPlacement
        submitLabel="Save hike"
      />
    </PageShell>
  );
}
