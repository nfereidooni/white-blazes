/**
 * The White Blazes logo: a double blaze (the trail sign for a turn) and
 * the wordmark in lowercase Bricolage Grotesque.
 * Colour comes from `currentColor`, so set `color` on a parent.
 */
export function DoubleBlaze({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" focusable="false">
      <rect x="40" y="12" width="20" height="40" rx="2" fill="currentColor" />
      <rect x="32" y="48" width="20" height="40" rx="2" fill="currentColor" />
    </svg>
  );
}

export function Logo({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`logo ${className}`} style={{ fontSize: size }}>
      <DoubleBlaze size={Math.round(size * 1.45)} />
      <span>white blazes</span>
    </span>
  );
}
