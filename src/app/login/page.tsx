import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./LoginForm";
import { Logo } from "@/components/Logo";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");

  const { error } = await searchParams;

  return (
    <main className="login">
      <div className="login-card">
        <Logo size={22} className="login-logo" />
        <p className="lede">
          White Blazes tracks your hikes on the Bruce Trail, Niagara to Tobermory. Log where you&rsquo;ve
          hiked and see how much of the trail you&rsquo;ve covered, section by section.
        </p>
        <h1>Sign in</h1>
        <p className="lede">Enter your email to get a magic link to log in.</p>
        <LoginForm error={error} />
      </div>
    </main>
  );
}
