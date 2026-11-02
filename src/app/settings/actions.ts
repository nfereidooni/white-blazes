"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SettingsState = { error?: string; saved?: boolean };

export async function saveSettings(_prev: SettingsState, form: FormData): Promise<SettingsState> {
  const display_name = String(form.get("display_name") ?? "").trim();
  const gap_fill_m = Number(form.get("gap_fill_m"));

  if (!display_name || display_name.length > 80) return { error: "Your name should be 1 to 80 characters." };
  if (![0, 100, 300].includes(gap_fill_m)) return { error: "Pick one of the gap options." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're signed out. Sign in and try again." };

  // The update policy only lets you change your own profile.
  const { error } = await supabase.from("profiles").update({ display_name, gap_fill_m }).eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { saved: true };
}
