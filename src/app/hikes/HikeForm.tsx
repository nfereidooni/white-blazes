"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import dynamic from "next/dynamic";
import type { HikeFormState } from "./actions";

// The map only loads in the browser, and only when "Map" is picked.
const MapPicker = dynamic(() => import("@/components/MapPicker").then((m) => m.MapPicker), {
  ssr: false,
  loading: () => <div className="map-box map-loading">Loading map…</div>,
});

type Section = { id: number; name: string; length_km: number };

export type HikeValues = {
  name: string;
  hiked_on: string;
  section_id: number | null;
  walked_km: number | null;
  is_club_hike: boolean;
  trail: "main" | "side";
};

// Ways to say where a hike went. They all end up as km ranges in
// hike_segments. The map and club series parts are still to come.
const BASE_PLACEMENTS = [
  { value: "skip", label: "Not yet" },
  { value: "map", label: "Map" },
  { value: "coords", label: "Coordinates" },
  { value: "km", label: "Km range" },
];

const HINTS: Record<string, string> = {
  keep: "Leave this hike where it is on the trail.",
  skip: "Saved as “needs placing”. It counts toward section km once you place it.",
  map: "",
  coords:
    "Paste where you started and finished. In Google or Apple Maps, press and hold a spot to copy its coordinates.",
  km: "Km from the south end of the section, as in the guidebook.",
};

export function HikeForm({
  action,
  sections,
  initial,
  showPlacement,
  currentPlacement,
  submitLabel,
}: {
  action: (prev: HikeFormState, form: FormData) => Promise<HikeFormState>;
  sections: Section[];
  initial?: Partial<HikeValues>;
  showPlacement: boolean;
  /** e.g. "Iroquoia km 15.1 to 27.6". Set when editing a hike that's already placed. */
  currentPlacement?: string;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const v = initial ?? {};
  const [trail, setTrail] = useState<"main" | "side">(v.trail ?? "main");
  const placements = currentPlacement ? [{ value: "keep", label: "Keep as is" }, ...BASE_PLACEMENTS] : BASE_PLACEMENTS;
  const [placement, setPlacement] = useState<string>(currentPlacement ? "keep" : "skip");
  const hasDetails = v.walked_km != null || v.is_club_hike || v.trail === "side";
  const [sectionId, setSectionId] = useState<number | null>(v.section_id ?? null);

  return (
    <form action={formAction} className="hike-form">
      <div className="field">
        <label htmlFor="name">Name</label>
        <input id="name" name="name" required maxLength={200} defaultValue={v.name ?? ""} placeholder="Mono Cliffs loop" />
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="hiked_on">Date</label>
          <input id="hiked_on" name="hiked_on" type="date" required defaultValue={v.hiked_on ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="section_id">Section</label>
          <select
            id="section_id"
            name="section_id"
            required
            defaultValue={v.section_id ?? ""}
            onChange={(e) => setSectionId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="" disabled>
              Choose a section
            </option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <details className="more" open={hasDetails}>
        <summary>More details</summary>
        <div className="more-body">
          <div className="field">
            <label htmlFor="walked_km">Distance walked (km)</label>
            <input id="walked_km" name="walked_km" type="number" min="0" step="0.1" inputMode="decimal" defaultValue={v.walked_km ?? ""} />
          </div>
          <fieldset className="field">
            <legend>Trail</legend>
            <label className="choice">
              <input type="radio" name="trail" value="main" checked={trail === "main"} onChange={() => setTrail("main")} /> Main
              trail (white blazes)
            </label>
            <label className="choice">
              <input type="radio" name="trail" value="side" checked={trail === "side"} onChange={() => setTrail("side")} /> Side
              trail (blue blazes)
            </label>
          </fieldset>
          <label className="choice">
            <input type="checkbox" name="is_club_hike" defaultChecked={v.is_club_hike ?? false} /> This was a club hike
          </label>
        </div>
      </details>

      {showPlacement && trail === "main" && (
        <fieldset className="field placement">
          <legend>Where on the trail?</legend>
          <div className="segmented">
            {placements.map((p) => (
              <label key={p.value}>
                <input
                  type="radio"
                  name="placement"
                  value={p.value}
                  checked={placement === p.value}
                  onChange={() => setPlacement(p.value)}
                />
                {p.label}
              </label>
            ))}
          </div>
          {HINTS[placement] !== "" && (
            <p className="hint">
              {placement === "keep" && currentPlacement ? `Currently ${currentPlacement}.` : HINTS[placement]}
            </p>
          )}
          {placement === "map" && <MapPicker sectionId={sectionId} />}
          {placement === "coords" && (
            <div className="field-row keep">
              <div className="field">
                <label htmlFor="coords_start">Start</label>
                <input id="coords_start" name="coords_start" required inputMode="decimal" placeholder="43.2557, -79.8711" autoComplete="off" />
              </div>
              <div className="field">
                <label htmlFor="coords_end">End</label>
                <input id="coords_end" name="coords_end" required inputMode="decimal" placeholder="43.2401, -79.9512" autoComplete="off" />
              </div>
            </div>
          )}
          {placement === "km" && (
            <div className="field-row keep">
              <div className="field">
                <label htmlFor="km_from">From km</label>
                <input id="km_from" name="km_from" type="number" min="0" step="0.1" inputMode="decimal" required />
              </div>
              <div className="field">
                <label htmlFor="km_to">To km</label>
                <input id="km_to" name="km_to" type="number" min="0" step="0.1" inputMode="decimal" required />
              </div>
            </div>
          )}
          <p className="soon-note">Coming soon: choose a club series part.</p>
        </fieldset>
      )}

      {showPlacement && trail === "side" && (
        <p className="hint">Side trail hikes go in your log but don&rsquo;t count toward main trail km.</p>
      )}

      {state.error && (
        <p className="error" role="alert">
          {state.error}
        </p>
      )}

      <div className="actions">
        <button type="submit" className="primary" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </button>
        <Link href="/" className="secondary">
          Cancel
        </Link>
      </div>
    </form>
  );
}
