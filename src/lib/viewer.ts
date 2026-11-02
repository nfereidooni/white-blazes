import type { User } from "@supabase/supabase-js";
import type { createClient } from "@/lib/supabase/server";
import { avatarUrl } from "@/lib/avatar";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Name and photo for the header's avatar button. */
export async function getViewer(supabase: Supabase, user: User) {
  const { data } = await supabase.from("profiles").select("display_name, avatar_path").single();
  return {
    name: data?.display_name ?? user.email ?? "",
    photo: await avatarUrl(supabase, data?.avatar_path),
  };
}
