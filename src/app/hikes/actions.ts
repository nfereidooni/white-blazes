"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type HikeFormState = { error?: string };

type Parsed = {
  hike: {
    name: string;
    hiked_on: string;
    section_id: number | null;
    walked_km: number | null;
    is_club_hike: boolean;
    trail: "main" | "side";
  };
  range: [number, number] | null;
};

const num = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
};

/**
 * Check the form before it reaches the database. The database checks again
 * (constraints, the segment trigger, RLS), but catching mistakes here gives
 * people a readable message instead of a Postgres error.
 */
function parse(form: FormData): Parsed | { error: string } {
  const name = String(form.get("name") ?? "").trim();
  const hiked_on = String(form.get("hiked_on") ?? "");
  const sectionRaw = String(form.get("section_id") ?? "");
  const walked = num(form.get("walked_km"));
  // Only read the km fields when "Km range" is the chosen placement.
  const useKm = form.get("placement") === "km";
  const from = useKm ? num(form.get("km_from")) : null;
  const to = useKm ? num(form.get("km_to")) : null;
  const trail = form.get("trail") === "side" ? "side" : "main";

  if (!name) return { error: "Give the hike a name." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(hiked_on)) return { error: "Pick the date you hiked." };
  if (!sectionRaw) return { error: "Pick the section you hiked in." };
  if (Number.isNaN(walked) || (walked !== null && walked < 0)) return { error: "Distance walked should be a number of km." };

  let range: [number, number] | null = null;
  if (from !== null || to !== null) {
    if (from === null || to === null || Number.isNaN(from) || Number.isNaN(to)) {
      return { error: "Fill in both ends of the km range, or leave both empty." };
    }
    if (from < 0 || to <= from) return { error: "The km range should go from a smaller number to a bigger one." };
    if (trail === "side") return { error: "Km ranges are for the main trail. Clear them for a side trail hike." };
    range = [from, to];
  }

  return {
    hike: {
      name,
      hiked_on,
      section_id: sectionRaw ? Number(sectionRaw) : null,
      walked_km: walked,
      is_club_hike: form.get("is_club_hike") === "on",
      trail,
    },
    range,
  };
}

async function saveRange(
  supabase: Awaited<ReturnType<typeof createClient>>,
  hikeId: string,
  sectionId: number | null,
  range: [number, number] | null,
) {
  // Replace whatever range the hike had. RLS only lets you touch segments
  // of your own hikes, so these can't reach anyone else's.
  const del = await supabase.from("hike_segments").delete().eq("hike_id", hikeId);
  if (del.error) return del.error.message;
  if (!range || sectionId === null) return null;
  const ins = await supabase
    .from("hike_segments")
    .insert({ hike_id: hikeId, section_id: sectionId, km: `[${range[0]},${range[1]})` });
  return ins.error ? friendly(ins.error.message) : null;
}

const friendly = (msg: string) =>
  msg.includes("runs past the end of section")
    ? "That km range runs past the end of the section. Check the section's length."
    : msg;

export async function createHike(_prev: HikeFormState, form: FormData): Promise<HikeFormState> {
  const parsed = parse(form);
  if ("error" in parsed) return parsed;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // We still send user_id. RLS's `with check` rejects the insert if it's
  // anyone but the signed-in person.
  const { data, error } = await supabase
    .from("hikes")
    .insert({ ...parsed.hike, user_id: user.id, source: "manual" })
    .select("id")
    .single();
  if (error) return { error: error.message };

  const rangeError = await saveRange(supabase, data.id, parsed.hike.section_id, parsed.range);
  if (rangeError) {
    // Two separate requests aren't one transaction, so undo the hike by hand.
    await supabase.from("hikes").delete().eq("id", data.id);
    return { error: rangeError };
  }

  revalidatePath("/");
  redirect("/");
}

export async function updateHike(id: string, canEditRange: boolean, _prev: HikeFormState, form: FormData): Promise<HikeFormState> {
  const parsed = parse(form);
  if ("error" in parsed) return parsed;

  const supabase = await createClient();
  const { data, error } = await supabase.from("hikes").update(parsed.hike).eq("id", id).select("id");
  if (error) return { error: error.message };
  // RLS skips rows you can't see without an error, so check something changed.
  if (!data?.length) return { error: "That hike wasn't found." };

  if (canEditRange) {
    const rangeError = await saveRange(supabase, id, parsed.hike.section_id, parsed.range);
    if (rangeError) return { error: rangeError };
  }

  revalidatePath("/");
  redirect("/");
}

export async function deleteHike(id: string) {
  const supabase = await createClient();
  // Segments go with it: the foreign key is `on delete cascade`.
  await supabase.from("hikes").delete().eq("id", id);
  revalidatePath("/");
  redirect("/");
}
