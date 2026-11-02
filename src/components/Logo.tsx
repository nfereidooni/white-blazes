/**
 * The White Blazes logo: a double blaze (the trail sign for a turn) and
 * the wordmark in lowercase Bricolage Grotesque.
 *
 * The blazes are always white, because white blazes are the whole point.
 * On dark backgrounds they sit straight on the page; on light ones
 * (`onLight`), they sit on a dark green tile, like the app icon.
 */
export function DoubleBlaze({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" focusable="false">
      <rect x="40" y="12" width="20" height="40" rx="2" fill="currentColor" />
      <rect x="32" y="48" width="20" height="40" rx="2" fill="currentColor" />
    </svg>
  );
}

export function Logo({ size = 20, className = "", onLight = false }: { size?: number; className?: string; onLight?: boolean }) {
  const mark = Math.round(size * 1.45);
  return (
    <span className={`logo ${onLight ? "logo-on-light" : ""} ${className}`} style={{ fontSize: size }}>
      {onLight ? (
        <span className="logo-tile" style={{ width: mark + 6, height: mark + 6 }}>
          <DoubleBlaze size={mark} />
        </span>
      ) : (
        <DoubleBlaze size={mark} />
      )}
      <span>white blazes</span>
    </span>
  );
}
