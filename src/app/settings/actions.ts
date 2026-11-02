"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type SettingsState = { error?: string; saved?: boolean };

export async function saveSettings(_prev: SettingsState, form: FormData): Promise<SettingsState> {
  const display_name = String(form.get("display_name") ?? "").trim();
  const goal = String(form.get("goal") ?? "").trim() || null;
  const gap_fill_m = Number(form.get("gap_fill_m"));
  const share_profile = form.get("share_profile") === "on";
  // Checkboxes with the same name arrive as a list: one entry per ticked box.
  const clubs = form.getAll("clubs").map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= 9);

  if (!display_name || display_name.length > 80) return { error: "Your name should be 1 to 80 characters." };
  if (goal && goal.length > 120) return { error: "Keep your goal under 120 characters." };
  if (![0, 100, 300].includes(gap_fill_m)) return { error: "Pick one of the gap options." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're signed out. Sign in and try again." };

  // The update policy only lets you change your own profile.
  const { error } = await supabase
    .from("profiles")
    .update({ display_name, goal, gap_fill_m, share_profile })
    .eq("id", user.id);
  if (error) return { error: error.message };

  // Swap the whole set of clubs in one database call (see set_home_clubs).
  const { error: clubsError } = await supabase.rpc("set_home_clubs", { section_ids: clubs });
  if (clubsError) return { error: clubsError.message };

  revalidatePath("/", "layout");
  return { saved: true };
}

/**
 * Called after the browser has uploaded a new photo to Storage. Saves its
 * path on your profile and removes the photo it replaces.
 */
export async function setAvatar(path: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're signed out." };

  const { data: before } = await supabase.from("profiles").select("avatar_path").single();
  // The check constraint also refuses a path outside your folder.
  const { error } = await supabase.from("profiles").update({ avatar_path: path }).eq("id", user.id);
  if (error) return { error: error.message };

  if (before?.avatar_path && before.avatar_path !== path) {
    await supabase.storage.from("avatars").remove([before.avatar_path]);
  }
  revalidatePath("/", "layout");
  return {};
}

export async function removeAvatar(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: before } = await supabase.from("profiles").select("avatar_path").single();
  await supabase.from("profiles").update({ avatar_path: null }).eq("id", user.id);
  if (before?.avatar_path) await supabase.storage.from("avatars").remove([before.avatar_path]);
  revalidatePath("/", "layout");
}

export type DeleteState = { error?: string };

/**
 * Deletes your account and everything in it. There's no undo.
 *
 * 1. Remove your photo files through the Storage API (deleting the database
 *    rows alone would leave the files on disk).
 * 2. Call delete_my_account(), which deletes your auth.users row. Foreign
 *    keys with "on delete cascade" take your profile, hikes, segments and
 *    clubs with it, inside one transaction.
 * 3. Clear the session cookies in this browser.
 */
export async function deleteAccount(_prev: DeleteState, form: FormData): Promise<DeleteState> {
  if (String(form.get("confirm") ?? "").trim().toLowerCase() !== "delete") {
    return { error: "Type delete to confirm." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're signed out." };

  const { data: files } = await supabase.storage.from("avatars").list(user.id);
  if (files?.length) {
    await supabase.storage.from("avatars").remove(files.map((f) => `${user.id}/${f.name}`));
  }

  const { error } = await supabase.rpc("delete_my_account");
  if (error) return { error: error.message };

  // The login is already gone on the server, so only clear this browser.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login?deleted=1");
}
