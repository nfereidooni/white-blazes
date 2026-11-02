import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageShell } from "@/components/PageShell";
import { HikeForm } from "../../HikeForm";
import { deleteHike, updateHike } from "../../actions";

const SOURCE_LABEL: Record<string, string> = {
  strava: "Strava",
  gpx: "a GPX file",
  club_export: "your club export",
};

export default async function EditHikePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // RLS returns nothing if this hike isn't yours, so someone else's id is a 404.
  const [{ data: hike }, { data: sections }, { data: segments }] = await Promise.all([
    supabase
      .from("hikes")
      .select(
        "id, name, hiked_on, section_id, walked_km, is_club_hike, trail, source, link, club_link, notes, hiked_with, hike_leader, start_point, end_point",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("sections").select("id, name, length_km").order("id"),
    supabase.from("hike_segments").select("section_id, km").eq("hike_id", id).order("section_id"),
  ]);
  if (!hike) notFound();

  // Ranges from a GPS track come from the track itself, so only hand-entered
  // hikes get the placement step.
  const canEditRange = hike.source === "manual";

  // Describe the current placement, e.g. "Iroquoia km 15.1 to 27.6".
  const sectionName = new Map((sections ?? []).map((s) => [s.id as number, s.name as string]));
  const currentPlacement = (segments ?? [])
    .map((g) => {
      const [from, to] = String(g.km).slice(1, -1).split(",").map(Number); // "[15.1,27.6)"
      return `${sectionName.get(g.section_id)} km ${from.toFixed(1)} to ${to.toFixed(1)}`;
    })
    .join(", then ");

  return (
    <PageShell title="Edit hike" eyebrow="Hikes" tab="hikes">
      {!canEditRange && (
        <p className="hint">
          This hike came from {SOURCE_LABEL[hike.source] ?? hike.source}, so where it went on the trail comes from its
          track.
        </p>
      )}
      <HikeForm
        action={updateHike.bind(null, id, canEditRange)}
        sections={sections ?? []}
        initial={hike}
        showPlacement={canEditRange}
        currentPlacement={currentPlacement || undefined}
        submitLabel="Save changes"
      />
      <form action={deleteHike.bind(null, id)} className="danger-zone">
        <button type="submit" className="danger">
          Delete this hike
        </button>
      </form>
    </PageShell>
  );
}
