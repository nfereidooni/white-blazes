"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type BadgeState = { error?: string };

/**
 * Record that a club sent you its end to end badge. "Upsert" means insert,
 * or update the date if it's already recorded: the primary key
 * (profile_id, section_id) tells Postgres which row it would clash with.
 */
export async function markBadge(_prev: BadgeState, form: FormData): Promise<BadgeState> {
  const sectionId = Number(form.get("section_id"));
  const receivedOn = String(form.get("received_on") ?? "");
  if (!Number.isInteger(sectionId) || sectionId < 1 || sectionId > 9) return { error: "Unknown section." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(receivedOn)) return { error: "Pick the date you received it." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're signed out." };

  const { error } = await supabase
    .from("badge_awards")
    .upsert({ profile_id: user.id, section_id: sectionId, received_on: receivedOn }, { onConflict: "profile_id,section_id" });
  // 23514 is a check constraint: here, a date in the future.
  if (error) return { error: error.code === "23514" ? "That date is in the future." : error.message };

  revalidatePath("/", "layout");
  return {};
}

export async function removeBadge(form: FormData): Promise<void> {
  const sectionId = Number(form.get("section_id"));
  const supabase = await createClient();
  // RLS limits the delete to your own rows, so no user filter is needed.
  await supabase.from("badge_awards").delete().eq("section_id", sectionId);
  revalidatePath("/", "layout");
}
