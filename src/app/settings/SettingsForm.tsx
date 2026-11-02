"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveSettings, type SettingsState } from "./actions";

const GAP_OPTIONS = [
  {
    value: 300,
    label: "300 m",
    hint: "Breaks under 300 m count as hiked. Good for GPS dropouts and short detours.",
  },
  {
    value: 100,
    label: "100 m",
    hint: "Only small blips in the GPS signal are filled in.",
  },
  {
    value: 0,
    label: "Off",
    hint: "Only exactly what your tracks show counts. Tiny holes may keep a section under 100%.",
  },
];

export type Club = { id: number; name: string };

export function SettingsForm({
  displayName,
  goal,
  gapFillM,
  shareProfile,
  clubs,
  myClubs,
  photo,
}: {
  displayName: string;
  goal: string;
  gapFillM: number;
  shareProfile: boolean;
  clubs: Club[];
  myClubs: number[];
  /** The photo uploader. It saves on its own, so it sits outside the form's fields. */
  photo?: React.ReactNode;
}) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(
    saveSettings,
    {},
  );

  return (
    <form action={action} className="settings-form">
      <section className="card hike-form" aria-labelledby="profile-h">
        <h2 id="profile-h">Profile</h2>
        {photo}
        <div className="field-row">
          <div className="field">
            <label htmlFor="display_name">Your name</label>
            <input
              id="display_name"
              name="display_name"
              required
              maxLength={80}
              defaultValue={displayName}
            />
            <p className="hint">Shown on your share page.</p>
          </div>

          <div className="field">
            <label htmlFor="goal">
              Your goal <span className="optional">optional</span>
            </label>
            <input
              id="goal"
              name="goal"
              maxLength={120}
              defaultValue={goal}
              placeholder="End to end by 2028"
            />
            <p className="hint">Shown above your progress.</p>
          </div>
        </div>

        <fieldset className="field">
          <legend>
            Home clubs <span className="optional">optional</span>
          </legend>
          <p className="hint">
            The Bruce Trail clubs you&rsquo;re a member of. Pick as many as you
            like.
          </p>
          <div className="club-grid">
            {clubs.map((c) => (
              <label key={c.id} className="choice">
                <input
                  type="checkbox"
                  name="clubs"
                  value={c.id}
                  defaultChecked={myClubs.includes(c.id)}
                />
                {c.name}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="field">
          <legend>Share page</legend>
          <label className="choice choice-top">
            <input
              type="checkbox"
              name="share_profile"
              defaultChecked={shareProfile}
            />
            <span>
              <strong>Show my photo and goal</strong>
              <span className="hint block">
                Only applies while your share link is on.
              </span>
            </span>
          </label>
        </fieldset>
      </section>

      <section className="card hike-form" aria-labelledby="tracking-h">
        <h2 id="tracking-h">Tracking</h2>
        <fieldset className="field">
          <legend>Fill small gaps in your tracks</legend>
          <p className="hint">
            When two stretches you&rsquo;ve hiked are separated by a short
            break, count the break as hiked. This changes how your km are
            calculated, not what&rsquo;s stored, so you can switch any time.
          </p>
          {GAP_OPTIONS.map((o) => (
            <label key={o.value} className="choice choice-top">
              <input
                type="radio"
                name="gap_fill_m"
                value={o.value}
                defaultChecked={gapFillM === o.value}
              />
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
      </section>
    </form>
  );
}
