"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { status: "idle" | "sent" | "error"; message?: string };

/**
 * A Server Action: this function only ever runs on the server, even though
 * the login form calls it like a normal function.
 */
export async function sendMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email || !email.includes("@")) {
    return { status: "error", message: "Enter your email address." };
  }

  const origin = (await headers()).get("origin") ?? "http://127.0.0.1:3000";
  const supabase = await createClient();

  // Sends an email with a one-time link. If this email has never signed in,
  // Supabase creates the account, which fires our profile trigger.
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/confirm` },
  });

  if (error) {
    return { status: "error", message: error.message };
  }
  return { status: "sent", message: email };
}
