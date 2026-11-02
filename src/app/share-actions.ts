"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Turn the public progress link on or off. */
export async function setSharing(enabled: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  // The update policy makes sure this only ever changes your own profile.
  await supabase.from("profiles").update({ share_enabled: enabled }).eq("id", user.id);
  revalidatePath("/");
}
