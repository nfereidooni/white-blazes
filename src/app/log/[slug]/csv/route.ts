import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTrailLog } from "@/lib/trailLog";

// Quote a CSV cell when it holds a comma, quote or line break.
const cell = (v: string | number | null) => {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** The trail log as a spreadsheet. Same data as the page, same RLS. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const log = await getTrailLog(supabase, slug);
  if (!log) return NextResponse.json({ error: "No such section." }, { status: 404 });

  const lines = [
    ["Date", "Hike", "Start point", "End point", "From km", "To km", "Km on trail", "Club hike", "Hike leader", "Club listing", "Activity link"],
    ...log.rows.map((r) => [
      r.date,
      r.name,
      r.startPoint,
      r.endPoint,
      r.from.toFixed(1),
      r.to.toFixed(1),
      (r.to - r.from).toFixed(1),
      r.isClubHike ? "Yes" : "No",
      r.leader,
      r.clubLink,
      r.activityLink,
    ]),
  ].map((row) => row.map(cell).join(","));

  // The BOM at the start makes Excel read accented names correctly.
  const body = "﻿" + lines.join("\r\n") + "\r\n";
  const file = `${log.section.slug}-trail-log.csv`;
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${file}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
