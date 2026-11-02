import { createBrowserClient } from "@supabase/ssr";

/**
 * A Supabase client for code running in the browser.
 *
 * It reads the same session cookies as the server client, so requests from
 * the browser carry your JWT and RLS treats them as you. The publishable key
 * is safe to ship to browsers: on its own it can only do what the policies
 * allow a signed-out visitor to do.
 *
 * Most of the app talks to Supabase from the server. The browser client is
 * used where it saves a round trip, like uploading a photo straight to
 * Storage instead of sending it through the Next.js server first.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
