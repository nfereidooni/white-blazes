import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * A Supabase client for Server Components, Server Actions and Route Handlers.
 *
 * The session (access token + refresh token) lives in cookies. This client
 * reads them from the incoming request, so every query runs as the signed-in
 * person and Row Level Security knows who they are.
 *
 * Make a new one per request. Never share one between requests: it would
 * carry one person's session into another person's request.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components can't set cookies. That's fine: the
            // middleware refreshes the session and sets them instead.
          }
        },
      },
    },
  );
}
