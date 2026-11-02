"use client";

import { useState } from "react";
import { GpxImport } from "./GpxImport";
import { StravaImport } from "./StravaImport";

/** One GPX file, or a whole Strava archive. Both end up in import_track. */
export function ImportChooser({ initial }: { initial: "gpx" | "strava" }) {
  const [mode, setMode] = useState(initial);
  return (
    <div className="hike-form">
      <div className="segmented" role="radiogroup" aria-label="What are you importing?">
        {(
          [
            ["gpx", "One GPX file"],
            ["strava", "Strava archive"],
          ] as const
        ).map(([value, label]) => (
          <label key={value}>
            <input type="radio" name="mode" value={value} checked={mode === value} onChange={() => setMode(value)} />
            {label}
          </label>
        ))}
      </div>
      {mode === "gpx" ? <GpxImport /> : <StravaImport />}
    </div>
  );
}
