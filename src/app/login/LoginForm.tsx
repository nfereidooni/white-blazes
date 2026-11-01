"use client";

import { useActionState } from "react";
import { sendMagicLink, type LoginState } from "./actions";

const initial: LoginState = { status: "idle" };

export function LoginForm({ error }: { error?: string }) {
  const [state, action, pending] = useActionState(sendMagicLink, initial);

  if (state.status === "sent") {
    return (
      <div className="notice" role="status">
        <strong>Check your email.</strong> We sent a sign-in link to {state.message}.
        <span className="hint">Running locally? It&rsquo;s in the test inbox at http://127.0.0.1:54324</span>
      </div>
    );
  }

  return (
    <form action={action} className="login-form">
      <label htmlFor="email">Email</label>
      <input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
      <button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Email me a sign-in link"}
      </button>
      {(state.status === "error" || error) && (
        <p className="error" role="alert">
          {state.message ?? "That link didn't work. It may have expired, so try again."}
        </p>
      )}
    </form>
  );
}
