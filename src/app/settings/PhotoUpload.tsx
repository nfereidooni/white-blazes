"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/Avatar";
import { removeAvatar, setAvatar } from "./actions";

const SIZE = 320;

/** Crop the middle square of a photo and shrink it, so uploads stay small. */
async function toSquareWebp(file: File): Promise<Blob> {
  const img = await createImageBitmap(file);
  const side = Math.min(img.width, img.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  canvas.getContext("2d")!.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't read that image."))), "image/webp", 0.85),
  );
}

export function PhotoUpload({ userId, url, name }: { userId: string; url: string | null; name: string }) {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await toSquareWebp(file);
      // A new file name each time, so browsers never show a cached old photo.
      // The folder is your user id: the Storage policies only let you write there.
      const path = `${userId}/${Date.now()}.webp`;
      const { error: upErr } = await createClient()
        .storage.from("avatars")
        .upload(path, blob, { contentType: "image/webp" });
      if (upErr) throw upErr;
      const res = await setAvatar(path);
      if (res.error) throw new Error(res.error);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="field">
      <span className="label">Profile photo</span>
      <div className="photo-row">
        <Avatar url={url} name={name} size={72} />
        <div className="actions">
          <button type="button" className="secondary" onClick={() => input.current?.click()} disabled={busy}>
            {busy ? "Uploading…" : url ? "Change photo" : "Add photo"}
          </button>
          {url && (
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await removeAvatar();
                router.refresh();
                setBusy(false);
              }}
            >
              Remove
            </button>
          )}
        </div>
        <input ref={input} type="file" accept="image/*" hidden onChange={onPick} />
      </div>
      <p className="hint">Cropped to a square. Private unless you show it on your share page.</p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
