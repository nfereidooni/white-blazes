import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The avatars bucket is private, so a photo has no permanent public URL.
 * Instead we ask Storage for a signed URL: a link with a token in it that
 * works for a limited time. Storage only signs it if the RLS policies on
 * storage.objects let the current person (or visitor) read that file.
 */
export async function avatarUrl(supabase: SupabaseClient, path: string | null | undefined) {
  if (!path) return null;
  const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}
