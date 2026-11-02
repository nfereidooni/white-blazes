import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./LoginForm";
import { Logo } from "@/components/Logo";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; deleted?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");

  const { error, deleted } = await searchParams;

  return (
    <main className="login">
      <div className="login-card">
        <Logo size={22} onLight className="login-logo" />
        {deleted && (
          <p className="notice" role="status">
            Your account and all your hikes have been deleted.
          </p>
        )}
        <p className="lede">
          White Blazes tracks your hikes along the Bruce Trail, from Niagara to Tobermory. Log where you&rsquo;ve
          hiked and see how much of the trail you&rsquo;ve covered, section by section.
        </p>
        <h1>Sign in</h1>
        <p className="lede">Enter your email to get a magic link to log in.</p>
        <LoginForm error={error} />
      </div>
    </main>
  );
}
