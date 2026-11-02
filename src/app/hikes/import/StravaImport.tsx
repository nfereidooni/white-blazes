"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { readStravaArchive, type StravaActivity } from "@/lib/strava";
import { importTrack, previewTracks, type Preview } from "./actions";

type Row = {
  activity: StravaActivity;
  preview: Preview;
  include: boolean;
  replaceId: string;
  club: boolean;
};

type Phase =
  | { kind: "idle" }
  | { kind: "reading"; done: number; total: number }
  | { kind: "matching"; done: number; total: number }
  | { kind: "review" }
  | { kind: "importing"; done: number; total: number };

const BATCH = 5;

const fmtDate = (iso: string | null) =>
  iso ? new Date(`${iso}T12:00:00`).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" }) : "No date";

export function StravaImport() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [rows, setRows] = useState<Row[]>([]);
  const [skipped, setSkipped] = useState({ offTrail: 0, unreadable: 0, elsewhere: 0 });
  const [error, setError] = useState<string | null>(null);
  const [failures, setFailures] = useState<string[]>([]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setRows([]);
    setFailures([]);
    try {
      // 1. Read the zip on this device.
      setPhase({ kind: "reading", done: 0, total: 0 });
      const archive = await readStravaArchive(file, (done, total) => setPhase({ kind: "reading", done, total }));

      // 2. Ask the server where each one went, a few at a time.
      const acts = archive.activities;
      const found: Row[] = [];
      let offTrail = 0;
      for (let i = 0; i < acts.length; i += BATCH) {
        setPhase({ kind: "matching", done: i, total: acts.length });
        const chunk = acts.slice(i, i + BATCH);
        const previews = await previewTracks(
          chunk.map((a) => ({ source: "strava" as const, externalId: a.activityId, lats: a.track.lats, lons: a.track.lons, date: a.date })),
        );
        previews.forEach((p, k) => {
          if ("error" in p) return;
          if (!p.stretches.length) {
            offTrail++;
            return;
          }
          const match = p.similar[0];
          found.push({
            activity: chunk[k],
            preview: p,
            include: !p.duplicate,
            replaceId: match?.id ?? "",
            club: match?.isClubHike ?? false,
          });
        });
      }
      setRows(found);
      setSkipped({ offTrail, unreadable: archive.unreadable, elsewhere: archive.elsewhere });
      setPhase({ kind: "review" });
    } catch (e) {
      setError((e as Error).message);
      setPhase({ kind: "idle" });
    }
  }

  const update = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  const chosen = rows.filter((r) => r.include && !r.preview.duplicate);

  async function onImport() {
    setFailures([]);
    const failed: string[] = [];
    const doneIds = new Set<string>();
    for (let i = 0; i < chosen.length; i++) {
      setPhase({ kind: "importing", done: i, total: chosen.length });
      const r = chosen[i];
      const res = await importTrack(
        {
          source: "strava",
          externalId: r.activity.activityId,
          lats: r.activity.track.lats,
          lons: r.activity.track.lons,
          date: r.activity.date,
          name: r.activity.name,
          walkedKm: r.activity.track.walkedKm,
          isClubHike: r.club,
          replaceId: r.replaceId || null,
        },
        false,
      );
      if ("error" in res) failed.push(`${r.activity.name}: ${res.error}`);
      else doneIds.add(r.activity.activityId);
    }
    if (failed.length) {
      // Mark the ones that worked as imported so a retry doesn't send them again.
      setRows((rs) =>
        rs.map((r) =>
          doneIds.has(r.activity.activityId)
            ? { ...r, include: false, preview: { ...r.preview, duplicate: { name: r.activity.name, hikedOn: r.activity.date ?? "" } } }
            : r,
        ),
      );
      setFailures(failed);
      setPhase({ kind: "review" });
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="hike-form">
      <div className="field">
        <label htmlFor="strava-zip">Strava export (.zip)</label>
        <input
          id="strava-zip"
          type="file"
          accept=".zip,application/zip"
          disabled={phase.kind !== "idle" && phase.kind !== "review"}
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <p className="hint">
          On strava.com: Settings → My Account → Download or Delete Your Account → Request your archive. Strava emails
          you a zip. It&rsquo;s read on your device; only hikes on the Bruce Trail are sent, as points, and nothing is
          kept but the hikes.
        </p>
      </div>

      {phase.kind === "reading" && (
        <p className="hint" role="status">
          Reading your archive{phase.total ? `: ${phase.done} of ${phase.total} hikes and walks` : "…"}
        </p>
      )}
      {phase.kind === "matching" && (
        <p className="hint" role="status">
          Finding where each hike went: {phase.done} of {phase.total}
        </p>
      )}
      {phase.kind === "importing" && (
        <p className="hint" role="status">
          Importing {phase.done + 1} of {phase.total}…
        </p>
      )}

      {phase.kind === "review" && (
        <>
          <div className="found">
            <p className="found-head">
              <span>
                {rows.length} {rows.length === 1 ? "hike follows" : "hikes follow"} the Bruce Trail
              </span>
              <span className="mono">{chosen.length} selected</span>
            </p>
            {(skipped.offTrail > 0 || skipped.elsewhere > 0 || skipped.unreadable > 0) && (
              <p className="hint">
                Skipped: {[
                  skipped.offTrail && `${skipped.offTrail} in the area but not on the main trail`,
                  skipped.elsewhere && `${skipped.elsewhere} far from the trail`,
                  skipped.unreadable && `${skipped.unreadable} recorded as .fit or .tcx files, which can't be read yet`,
                ]
                  .filter(Boolean)
                  .join(", ")}
                .
              </p>
            )}
          </div>

          {rows.length > 0 && (
            <ul className="import-list">
              {rows.map((r, i) => {
                const dup = r.preview.duplicate;
                return (
                  <li key={r.activity.activityId} className={dup ? "is-dup" : ""}>
                    <label className="choice choice-top">
                      <input
                        type="checkbox"
                        checked={r.include && !dup}
                        disabled={!!dup}
                        onChange={(e) => update(i, { include: e.target.checked })}
                      />
                      <span>
                        <strong>{r.activity.name}</strong>
                        <span className="hint block">
                          {fmtDate(r.activity.date)} · {r.preview.onTrailKm.toFixed(1)} km on the trail ·{" "}
                          {r.preview.stretches.map((s) => `${s.section} km ${s.from.toFixed(1)} to ${s.to.toFixed(1)}`).join(", ")}
                        </span>
                        {dup && <span className="tag">already imported</span>}
                      </span>
                    </label>
                    {!dup && r.include && (
                      <div className="row-options">
                        {r.preview.similar.length > 0 && (
                          <select
                            aria-label={`What to do with ${r.activity.name}`}
                            value={r.replaceId}
                            onChange={(e) => update(i, { replaceId: e.target.value })}
                          >
                            {r.preview.similar.map((s) => (
                              <option key={s.id} value={s.id}>
                                Replace &ldquo;{s.name}&rdquo;
                              </option>
                            ))}
                            <option value="">Keep both</option>
                          </select>
                        )}
                        <label className="choice">
                          <input type="checkbox" checked={r.club} onChange={(e) => update(i, { club: e.target.checked })} /> Club hike
                        </label>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {failures.length > 0 && (
            <div className="error" role="alert">
              These didn&rsquo;t import:
              <ul>
                {failures.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="actions">
            <button type="button" className="primary" disabled={!chosen.length} onClick={onImport}>
              Import {chosen.length} {chosen.length === 1 ? "hike" : "hikes"}
            </button>
            <Link href="/" className="secondary">
              Cancel
            </Link>
          </div>
        </>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
