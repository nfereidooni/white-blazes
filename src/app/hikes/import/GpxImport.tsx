"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { parseGpx, type ParsedTrack } from "@/lib/gpx";
import { importTrack, previewTrack, type Preview } from "./actions";

const fmtDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });

export function GpxImport() {
  const [track, setTrack] = useState<ParsedTrack | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reading, startReading] = useTransition();
  const [saving, startSaving] = useTransition();

  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [club, setClub] = useState(false);
  const [replaceId, setReplaceId] = useState<string>("");

  function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setPreview(null);
    setTrack(null);
    startReading(async () => {
      try {
        const t = await parseGpx(await file.text());
        const p = await previewTrack({ source: "gpx", externalId: t.hash, lats: t.lats, lons: t.lons, date: t.date });
        if ("error" in p) return setError(p.error);
        setTrack(t);
        setPreview(p);
        // If it looks like a hike you already logged, start from that hike's details.
        const match = p.similar[0];
        setName(match?.name ?? t.name ?? file.name.replace(/\.gpx$/i, ""));
        setDate(t.date ?? "");
        setClub(match?.isClubHike ?? false);
        setReplaceId(match?.id ?? "");
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!track) return;
    setError(null);
    startSaving(async () => {
      const res = await importTrack({
        source: "gpx",
        externalId: track.hash,
        lats: track.lats,
        lons: track.lons,
        date,
        name,
        walkedKm: track.walkedKm,
        isClubHike: club,
        replaceId: replaceId || null,
      });
      if (res && "error" in res) setError(res.error);
    });
  }

  return (
    <div className="hike-form">
      <div className="field">
        <label htmlFor="gpx">GPX file</label>
        <input id="gpx" type="file" accept=".gpx,application/gpx+xml" onChange={(e) => onFile(e.target.files?.[0])} />
        <p className="hint">
          From Strava, AllTrails, Gaia, a watch or any app that exports GPX. The file is read on your device and not
          uploaded or kept. Only the hike and where it went on the trail are saved.
        </p>
      </div>

      {reading && <p className="hint">Reading your track…</p>}

      {preview && track && preview.duplicate && (
        <div className="notice notice-warn" role="status">
          <strong>Already imported.</strong> This file is in your log as &ldquo;{preview.duplicate.name}&rdquo; on{" "}
          {fmtDate(preview.duplicate.hikedOn)}.
          <Link href="/">Back to your hikes</Link>
        </div>
      )}

      {preview && track && !preview.duplicate && (
        <form onSubmit={onSave} className="hike-form">
          <div className="found">
            <p className="found-head">
              <span className="mono">{track.walkedKm.toFixed(1)} km walked</span>
              <span className="mono">{preview.onTrailKm.toFixed(1)} km on the main trail</span>
            </p>
            {preview.stretches.length ? (
              <ul className="found-list">
                {preview.stretches.map((s) => (
                  <li key={`${s.sectionId}-${s.from}`}>
                    {s.section} km {s.from.toFixed(1)} to {s.to.toFixed(1)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="hint">
                This track doesn&rsquo;t follow the white-blazed main trail, so it will be saved as a side trail hike.
              </p>
            )}
          </div>

          {preview.similar.length > 0 && (
            <fieldset className="field">
              <legend>This might be a hike you already logged</legend>
              {preview.similar.map((s) => (
                <label key={s.id} className="choice choice-top">
                  <input type="radio" name="replace" checked={replaceId === s.id} onChange={() => setReplaceId(s.id)} />
                  <span>
                    Replace &ldquo;{s.name}&rdquo;
                    <span className="hint block">
                      {s.placed ? "The track's position replaces the one you entered." : "It isn't placed yet; the track places it."}
                    </span>
                  </span>
                </label>
              ))}
              <label className="choice">
                <input type="radio" name="replace" checked={replaceId === ""} onChange={() => setReplaceId("")} /> Keep both
              </label>
            </fieldset>
          )}

          <div className="field">
            <label htmlFor="name">Name</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={200} />
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="date">Date</label>
              <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="field">
              <span className="label-spacer" aria-hidden="true">
                &nbsp;
              </span>
              <label className="choice">
                <input type="checkbox" checked={club} onChange={(e) => setClub(e.target.checked)} /> This was a club hike
              </label>
            </div>
          </div>

          <div className="actions">
            <button type="submit" className="primary" disabled={saving}>
              {saving ? "Saving…" : replaceId ? "Replace hike" : "Save hike"}
            </button>
            <Link href="/" className="secondary">
              Cancel
            </Link>
          </div>
        </form>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
