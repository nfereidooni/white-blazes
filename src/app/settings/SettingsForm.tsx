"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveSettings, type SettingsState } from "./actions";

const GAP_OPTIONS = [
  { value: 300, label: "300 m", hint: "Breaks under 300 m count as hiked. Good for GPS dropouts and short detours." },
  { value: 100, label: "100 m", hint: "Only small blips in the GPS signal are filled in." },
  { value: 0, label: "Off", hint: "Only exactly what your tracks show counts. Tiny holes may keep a section under 100%." },
];

export function SettingsForm({ displayName, gapFillM }: { displayName: string; gapFillM: number }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveSettings, {});

  return (
    <form action={action} className="hike-form">
      <div className="field">
        <label htmlFor="display_name">Your name</label>
        <input id="display_name" name="display_name" required maxLength={80} defaultValue={displayName} />
        <p className="hint">Shown on your share page.</p>
      </div>

      <fieldset className="field">
        <legend>Fill small gaps in your tracks</legend>
        <p className="hint">
          When two stretches you&rsquo;ve hiked are separated by a short break, count the break as hiked. This changes
          how your km are calculated, not what&rsquo;s stored, so you can switch any time.
        </p>
        {GAP_OPTIONS.map((o) => (
          <label key={o.value} className="choice choice-top">
            <input type="radio" name="gap_fill_m" value={o.value} defaultChecked={gapFillM === o.value} />
            <span>
              <strong>{o.label}</strong>
              <span className="hint block">{o.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {state.error && (
        <p className="error" role="alert">
          {state.error}
        </p>
      )}
      {state.saved && (
        <p className="saved" role="status">
          Saved.
        </p>
      )}

      <div className="actions">
        <button type="submit" className="primary" disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </button>
        <Link href="/" className="secondary">
          Back
        </Link>
      </div>
    </form>
  );
}
