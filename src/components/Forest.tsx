/**
 * The pine and contour-line backdrop behind every page header. Purely
 * decorative, so it's hidden from screen readers. "tall" sits behind the
 * home and share heroes, "slim" behind the other pages' titles.
 */
const Pine = () => (
  <symbol id="wb-pine" viewBox="0 0 40 100">
    <path d="M20 0 L31 28 H25 L35 52 H27 L39 82 H23 V100 H17 V82 H1 L13 52 H5 L15 28 H9 Z" />
  </symbol>
);

type Tree = [x: number, y: number, w: number, h: number];

function Trees({ trees, fill }: { trees: Tree[]; fill: string }) {
  return (
    <g fill={fill}>
      {trees.map(([x, y, w, h], i) => (
        <use key={i} href="#wb-pine" x={x} y={y} width={w} height={h} />
      ))}
    </g>
  );
}

export function Forest({ variant = "tall" }: { variant?: "tall" | "slim" }) {
  if (variant === "slim") {
    return (
      <svg className="forest" aria-hidden="true" viewBox="0 0 1280 210" preserveAspectRatio="xMidYMax slice">
        <defs>
          <Pine />
        </defs>
        <g fill="none" stroke="#2c4d36" strokeWidth="1.2">
          <path d="M-20 40 C 180 10, 340 90, 560 50 S 900 0, 1300 60" />
          <path d="M-20 75 C 200 45, 360 120, 580 82 S 920 35, 1300 95" />
          <path d="M-20 110 C 220 80, 380 150, 600 116 S 940 72, 1300 130" />
        </g>
        <path d="M0 180 L140 158 L300 168 L460 140 L620 150 L760 130 L900 156 L1060 140 L1280 126 V210 H0 Z" fill="#1c3524" />
        <Trees fill="#24452f" trees={[[420, 102, 26, 64], [444, 114, 22, 54], [980, 94, 28, 70]]} />
        <Trees fill="#0d1a12" trees={[[-6, 140, 36, 88], [640, 150, 30, 74], [1160, 136, 36, 88], [1236, 140, 36, 90]]} />
      </svg>
    );
  }
  return (
    <svg className="forest" aria-hidden="true" viewBox="0 0 1280 440" preserveAspectRatio="xMidYMax slice">
      <defs>
        <Pine />
      </defs>
      <g fill="none" stroke="#2c4d36" strokeWidth="1.2">
        <path d="M-20 80 C 180 40, 340 130, 560 90 S 900 30, 1300 100" />
        <path d="M-20 115 C 200 75, 360 160, 580 122 S 920 65, 1300 135" />
        <path d="M-20 150 C 220 110, 380 192, 600 156 S 940 102, 1300 170" />
        <path d="M-20 185 C 240 148, 400 224, 620 190 S 960 140, 1300 206" />
        <path d="M700 50 C 760 30, 840 40, 870 70 S 820 120, 760 110 S 660 80, 700 50 Z" />
        <path d="M725 62 C 765 50, 820 56, 838 74 S 806 102, 768 96 S 700 78, 725 62 Z" />
      </g>
      <path
        d="M0 350 L120 320 L260 332 L420 288 L520 296 L600 256 L640 260 L700 310 L860 302 L1000 270 L1120 282 L1280 250 V440 H0 Z"
        fill="#1c3524"
      />
      <Trees
        fill="#24452f"
        trees={[[40, 282, 34, 86], [70, 296, 28, 72], [560, 220, 36, 90], [590, 234, 30, 76], [940, 246, 32, 80], [1180, 218, 38, 96]]}
      />
      <Trees
        fill="#0d1a12"
        trees={[[-8, 320, 50, 126], [300, 350, 36, 92], [330, 334, 46, 112], [760, 340, 44, 108], [1040, 330, 48, 116], [1236, 324, 50, 122]]}
      />
    </svg>
  );
}
