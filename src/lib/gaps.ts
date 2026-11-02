/** "{[0.0,27.6),[43.0,83.8)}" → [[0, 27.6], [43, 83.8]] */
export function parseMulti(m: string | null | undefined): [number, number][] {
  return [...String(m ?? "").matchAll(/[[(]([\d.]+),([\d.]+)[\])]/g)].map((x) => [Number(x[1]), Number(x[2])]);
}

export const parseRange = (r: string) => String(r).slice(1, -1).split(",").map(Number) as [number, number];

export type Segment = { sectionId: number; from: number; to: number; startPoint: string | null; endPoint: string | null };

export type GapSuggestion = {
  sectionName: string;
  sectionSlug: string;
  from: number;
  to: number;
  /** Named ends, taken from the hikes on either side when you filled in start and end points. */
  fromName: string | null;
  toName: string | null;
  /** "between": a hole between two stretches you've hiked. "next": where you left off. */
  kind: "between" | "next";
};

const near = (a: number, b: number) => Math.abs(a - b) < 0.1;

/**
 * The gap worth hiking next. First choice: the shortest hole between two
 * stretches you've already hiked, in any section. If there's none, the
 * stretch right after your furthest point in your most-hiked section.
 */
export function closestGap(
  sections: { id: number; slug: string; name: string; lengthKm: number; covered: [number, number][]; doneKm: number }[],
  segments: Segment[],
): GapSuggestion | null {
  let best: GapSuggestion | null = null;

  for (const s of sections) {
    for (let i = 1; i < s.covered.length; i++) {
      const from = s.covered[i - 1][1];
      const to = s.covered[i][0];
      if (to - from < 0.05) continue;
      if (!best || to - from < best.to - best.from) {
        const segs = segments.filter((g) => g.sectionId === s.id);
        best = {
          sectionName: s.name,
          sectionSlug: s.slug,
          from,
          to,
          fromName: segs.find((g) => near(g.to, from) && g.endPoint)?.endPoint ?? null,
          toName: segs.find((g) => near(g.from, to) && g.startPoint)?.startPoint ?? null,
          kind: "between",
        };
      }
    }
  }
  if (best) return best;

  const most = [...sections].filter((s) => s.covered.length).sort((a, b) => b.doneKm - a.doneKm)[0];
  if (!most) return null;
  const last = most.covered[most.covered.length - 1];
  if (most.lengthKm - last[1] >= 0.05) {
    const seg = segments.find((g) => g.sectionId === most.id && near(g.to, last[1]) && g.endPoint);
    return { sectionName: most.name, sectionSlug: most.slug, from: last[1], to: most.lengthKm, fromName: seg?.endPoint ?? null, toName: null, kind: "next" };
  }
  const first = most.covered[0];
  if (first[0] >= 0.05) {
    const seg = segments.find((g) => g.sectionId === most.id && near(g.from, first[0]) && g.startPoint);
    return { sectionName: most.name, sectionSlug: most.slug, from: 0, to: first[0], fromName: null, toName: seg?.startPoint ?? null, kind: "next" };
  }
  return null;
}
