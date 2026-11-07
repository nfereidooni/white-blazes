"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Join or leave the "tell me when Strava sync is ready" list. */
export async function setStravaSyncList(form: FormData) {
  const on = form.get("on") === "true";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  // RLS limits this to your own profile row.
  await supabase.from("profiles").update({ wants_strava_sync: on }).eq("id", user.id);
  revalidatePath("/hikes/import");
}
