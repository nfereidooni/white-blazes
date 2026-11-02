/** A round profile photo, or the person's initials when there isn't one. */
export function Avatar({ url, name, size = 32 }: { url: string | null; name: string; size?: number }) {
  const initials =
    name
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join("") || "?";
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element -- signed URLs change every hour, so skip image optimisation
    <img src={url} alt="" width={size} height={size} className="avatar" />
  ) : (
    <span className="avatar avatar-initials" style={{ width: size, height: size, fontSize: size * 0.4 }} aria-hidden="true">
      {initials}
    </span>
  );
}
