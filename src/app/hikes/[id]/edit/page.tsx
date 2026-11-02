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
      .select("id, name, hiked_on, section_id, walked_km, is_club_hike, trail, source")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("sections").select("id, name, length_km").order("id"),
    supabase.from("hike_segments").select("km").eq("hike_id", id),
  ]);
  if (!hike) notFound();

  // Ranges from a GPS track come from the track itself, so only hand-entered
  // hikes get the km fields. A manual hike has at most one range.
  const canEditRange = hike.source === "manual";
  const range = segments?.[0]?.km as string | undefined; // e.g. "[15.1,27.6)"
  const [km_from, km_to] = range ? range.slice(1, -1).split(",").map(Number) : [null, null];

  return (
    <PageShell title="Edit hike">
      {!canEditRange && (
        <p className="hint">
          This hike came from {SOURCE_LABEL[hike.source] ?? hike.source}, so where it went on the trail comes from its
          track.
        </p>
      )}
      <HikeForm
        action={updateHike.bind(null, id, canEditRange)}
        sections={sections ?? []}
        initial={{ ...hike, km_from, km_to }}
        showPlacement={canEditRange}
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
