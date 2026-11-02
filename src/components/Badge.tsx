/**
 * Section badge illustrations, one per club, ported from the design canvas.
 * Keyed by the section's slug.
 */
const STYLE: Record<string, { bg: string; border: string; stitch: string; label: string }> = {
  niagara: { bg: "#8fc3d1", border: "#2b9aa6", stitch: "#f7f5ee", label: "Monument tower" },
  iroquoia: { bg: "#ecc546", border: "#d9772b", stitch: "#fbf8ef", label: "Red fox" },
  toronto: { bg: "#9fcde3", border: "#1f3a5f", stitch: "#f7f5ee", label: "Lime kiln" },
  caledon: { bg: "#8fc3d1", border: "#c8442f", stitch: "#f7f5ee", label: "Redside dace" },
  dufferin: { bg: "#cfe3b4", border: "#3d6b45", stitch: "#3d6b45", label: "Pink rose" },
  blue: { bg: "#4a78b0", border: "#2b9aa6", stitch: "#f7f5ee", label: "Hiking boot" },
  beaver: { bg: "#fbfaf5", border: "#3d6b45", stitch: "#3d6b45", label: "Apple tree" },
  sydenham: { bg: "#c48a3a", border: "#ecc546", stitch: "#f7f5ee", label: "Backpack" },
  peninsula: { bg: "#8fc3d1", border: "#2b9aa6", stitch: "#f7f5ee", label: "Flowerpot rock" },
};

function Art({ kind }: { kind: string }) {
  switch (kind) {
    case "niagara":
      return (
        <g>
          <path d="M0 76 C 24 66, 76 66, 100 76 V100 H0 Z" fill="#3d6b45" />
          <rect x="45" y="30" width="10" height="42" fill="#f4efe2" />
          <rect x="41" y="68" width="18" height="6" fill="#ddd3bc" />
          <rect x="43" y="27" width="14" height="4" fill="#ddd3bc" />
          <path d="M47 27 L48 19 L52 19 L53 27 Z" fill="#f4efe2" />
          <circle cx="50" cy="17" r="3" fill="#f4efe2" />
          <path d="M47 36 H53 M47 46 H53 M47 56 H53" stroke="#c4b99f" strokeWidth="1" />
        </g>
      );
    case "iroquoia":
      return (
        <g>
          <path d="M27 38 L33 16 L45 32 L55 32 L67 16 L73 38 L50 76 Z" fill="#c85f1e" />
          <path d="M33 22 L36 33 L42 31 Z M67 22 L64 33 L58 31 Z" fill="#5b2e14" />
          <path d="M27 38 L39 50 L50 76 Z M73 38 L61 50 L50 76 Z" fill="#fbf8ef" />
          <path d="M39 50 L50 58 L61 50 L50 76 Z" fill="#fbf8ef" />
          <circle cx="41" cy="44" r="2.6" fill="#172219" />
          <circle cx="59" cy="44" r="2.6" fill="#172219" />
          <circle cx="50" cy="73" r="3.4" fill="#172219" />
        </g>
      );
    case "toronto":
      return (
        <g>
          <path d="M0 72 C 30 68, 70 68, 100 72 V100 H0 Z" fill="#5e9a45" />
          <path d="M0 80 C 30 76, 70 77, 100 80 V100 H0 Z" fill="#4a8236" />
          <path d="M26 76 V42 H74 V76 Z" fill="#cdbb9c" />
          <path d="M40 22 H60 L64 42 H36 Z" fill="#b8a483" />
          <path d="M40 76 V62 C 40 52, 60 52, 60 62 V76 Z" fill="#3a2c22" />
          <path d="M26 52 H40 M60 52 H74 M26 64 H38 M62 64 H74 M44 32 H56 M33 42 V52 M67 42 V52" stroke="#9d8a6c" strokeWidth="1.2" />
        </g>
      );
    case "caledon":
      return (
        <g>
          <path d="M0 74 C 20 70, 34 78, 50 74 S 80 70, 100 74 V100 H0 Z" fill="#6aa9c2" />
          <path d="M8 84 C 22 81, 32 87, 46 84 M56 88 C 70 85, 80 91, 94 88" fill="none" stroke="#e6f3f7" strokeWidth="1.6" />
          <path d="M14 47 C 18 41, 28 38, 42 38 C 56 38, 66 41, 72 45 L84 36 L81 47 L84 58 L72 50 C 66 54, 56 57, 42 57 C 28 57, 18 54, 14 47 Z" fill="#e9ebdf" />
          <path d="M14 47 C 18 41, 28 38, 42 38 C 56 38, 66 41, 72 45 L72 47 C 60 45, 40 44, 14 47 Z" fill="#5c6a3c" />
          <path d="M22 48 C 34 46, 52 46, 72 48" fill="none" stroke="#3a4228" strokeWidth="2" />
          <path d="M20 50 C 26 55, 40 56, 50 53 C 46 51, 34 50, 20 50 Z" fill="#d23a2a" />
          <path d="M72 45 L84 36 L81 47 L84 58 L72 50 Z" fill="#7d8a5a" />
          <path d="M14 47 L19 48" stroke="#3a4228" strokeWidth="1.2" />
          <circle cx="21" cy="45" r="2.2" fill="#172219" />
        </g>
      );
    case "dufferin":
      return (
        <g>
          <path d="M50 58 V100" stroke="#3d6b45" strokeWidth="3" />
          <path d="M50 74 C 40 66, 30 68, 28 74 C 36 80, 44 78, 50 74 Z" fill="#4f7f3a" />
          <path d="M50 66 C 60 58, 70 60, 72 66 C 64 72, 56 70, 50 66 Z" fill="#4f7f3a" />
          <circle cx="50" cy="40" r="20" fill="#e88aa6" />
          <circle cx="38" cy="36" r="10" fill="#f0a3b9" />
          <circle cx="62" cy="36" r="10" fill="#f0a3b9" />
          <circle cx="50" cy="26" r="10" fill="#f0a3b9" />
          <circle cx="50" cy="40" r="11" fill="#d1607f" />
          <circle cx="50" cy="40" r="5" fill="#a83d5c" />
        </g>
      );
    case "blue":
      return (
        <g>
          <path d="M0 74 L20 54 L34 64 L56 38 L80 60 L100 50 V100 H0 Z" fill="#2c4f80" />
          <path d="M34 26 H52 V54 C 58 58, 70 60, 74 66 V72 H30 V30 Z" fill="#8a5631" />
          <path d="M28 72 H76 V80 H28 Z" fill="#3a2c22" />
          <path d="M52 34 L42 36 M52 41 L42 43 M52 48 L42 50" stroke="#f0d9a8" strokeWidth="2" strokeLinecap="round" />
          <path d="M34 26 H52 V30 H34 Z" fill="#6b3f22" />
        </g>
      );
    case "beaver":
      return (
        <g>
          <path d="M0 80 C 30 76, 70 76, 100 80 V100 H0 Z" fill="#6e9b4c" />
          <path d="M46 80 V58 L40 50 M54 80 V58 L60 50 M46 62 H54" stroke="#6b4a2f" strokeWidth="6" strokeLinecap="round" fill="none" />
          <circle cx="50" cy="40" r="24" fill="#5e8a40" />
          <circle cx="34" cy="48" r="12" fill="#4f7f3a" />
          <circle cx="66" cy="48" r="12" fill="#4f7f3a" />
          <circle cx="40" cy="34" r="4" fill="#c8442f" />
          <circle cx="58" cy="30" r="4" fill="#c8442f" />
          <circle cx="62" cy="48" r="4" fill="#c8442f" />
          <circle cx="34" cy="50" r="4" fill="#c8442f" />
          <circle cx="50" cy="46" r="4" fill="#c8442f" />
        </g>
      );
    case "sydenham":
      return (
        <g>
          <path d="M38 30 C 38 20, 62 20, 62 30" fill="none" stroke="#1c3524" strokeWidth="3" />
          <rect x="30" y="28" width="40" height="52" rx="10" fill="#2f5d3a" />
          <path d="M30 40 C 30 32, 70 32, 70 40 V46 H30 Z" fill="#24452f" />
          <rect x="38" y="56" width="24" height="16" rx="4" fill="#3d6b45" />
          <path d="M38 62 H62" stroke="#24452f" strokeWidth="1.4" />
          <circle cx="50" cy="44" r="2.4" fill="#e8b46a" />
          <rect x="26" y="52" width="5" height="18" rx="2.5" fill="#1c3524" />
          <rect x="69" y="52" width="5" height="18" rx="2.5" fill="#1c3524" />
        </g>
      );
    case "peninsula":
      return (
        <g>
          <path d="M0 72 H100 V100 H0 Z" fill="#2f7f8f" />
          <path d="M14 78 C 22 75, 28 81, 36 78 M58 82 C 66 79, 72 85, 80 82" fill="none" stroke="#a9d3e3" strokeWidth="1.6" />
          <path d="M44 74 C 42 64, 40 56, 36 46 C 34 38, 40 34, 50 34 C 62 34, 66 38, 64 46 C 60 56, 58 64, 56 74 Z" fill="#c9b79a" />
          <path d="M42 54 C 46 56, 54 56, 58 54 M40 44 C 46 46, 56 46, 62 44" fill="none" stroke="#a8946f" strokeWidth="1.2" />
          <path d="M42 34 L46 22 L50 34 Z M48 34 L53 18 L58 34 Z M55 35 L59 26 L63 36 Z" fill="#24452f" />
        </g>
      );
    default:
      return null;
  }
}

export function Badge({ kind, size = 80 }: { kind: string; size?: number }) {
  const s = STYLE[kind] ?? STYLE.iroquoia;
  const clip = `badge-clip-${kind}`;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={clip}>
          <circle cx="50" cy="50" r="48" />
        </clipPath>
      </defs>
      <circle cx="50" cy="50" r="48" fill={s.bg} />
      <g clipPath={`url(#${clip})`}>
        <Art kind={kind} />
      </g>
      <circle cx="50" cy="50" r="40.5" fill="none" stroke={s.stitch} strokeOpacity="0.7" strokeWidth="1.4" strokeDasharray="3 3" />
      <circle cx="50" cy="50" r="46" fill="none" stroke={s.border} strokeWidth="5" />
    </svg>
  );
}

/** The badge inside a progress ring. Faded until the section is finished. */
export function BadgeRing({ kind, fraction, size = 104 }: { kind: string; fraction: number; size?: number }) {
  const f = Math.max(0, Math.min(1, fraction));
  const inner = Math.round(size * 0.77);
  return (
    <div className="badge-ring" style={{ width: size, height: size }}>
      <svg viewBox="0 0 104 104" width={size} height={size} aria-hidden="true">
        <circle cx="52" cy="52" r="48" fill="none" stroke="#dbe4cf" strokeWidth="6" />
        {f > 0 && (
          <circle
            cx="52"
            cy="52"
            r="48"
            fill="none"
            stroke="#3d6b45"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${(f * 301.6).toFixed(1)} 302`}
            transform="rotate(-90 52 52)"
          />
        )}
      </svg>
      <span className={f >= 0.995 ? "badge-art" : "badge-art badge-faded"}>
        <Badge kind={kind} size={inner} />
      </span>
    </div>
  );
}
