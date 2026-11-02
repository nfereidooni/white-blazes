import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const cell = (v: string | number | boolean | null | undefined) => {
  const s = v == null ? "" : typeof v === "boolean" ? (v ? "Yes" : "No") : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

type Hike = {
  id: string;
  hiked_on: string;
  name: string;
  trail: string;
  section_id: number | null;
  walked_km: number | null;
  source: string;
  is_club_hike: boolean;
  club_link: string | null;
  hike_leader: string | null;
  hiked_with: string | null;
  start_point: string | null;
  end_point: string | null;
  link: string | null;
  notes: string | null;
  created_at: string;
};

/**
 * Every hike you've logged, as one CSV. Nothing here filters by user: RLS
 * does that inside Postgres, so this can only ever return your own rows.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const [hikesRes, segRes, sectionsRes] = await Promise.all([
    supabase
      .from("hikes")
      .select(
        "id, hiked_on, name, trail, section_id, walked_km, source, is_club_hike, club_link, hike_leader, hiked_with, start_point, end_point, link, notes, created_at",
      )
      .order("hiked_on"),
    supabase.from("hike_segments").select("hike_id, section_id, km"),
    supabase.from("sections").select("id, name"),
  ]);
  if (hikesRes.error) return NextResponse.json({ error: hikesRes.error.message }, { status: 500 });

  const sectionName = new Map((sectionsRes.data ?? []).map((s) => [s.id as number, s.name as string]));
  // A hike can cover stretches of more than one section: "Toronto 12.0–18.5; Caledon Hills 0.0–3.2".
  const placed = new Map<string, string[]>();
  for (const s of segRes.data ?? []) {
    const [from, to] = String(s.km).slice(1, -1).split(",").map(Number);
    const list = placed.get(s.hike_id) ?? [];
    list.push(`${sectionName.get(s.section_id) ?? s.section_id} ${from.toFixed(1)}–${to.toFixed(1)} km`);
    placed.set(s.hike_id, list);
  }

  const header = [
    "Date", "Hike", "Trail", "Section", "Placed on trail", "Distance km", "Source", "Club hike", "Club listing",
    "Hike leader", "Hiked with", "Start point", "End point", "Activity link", "Notes", "Logged at",
  ];
  const rows = ((hikesRes.data ?? []) as Hike[]).map((h) => [
    h.hiked_on,
    h.name,
    h.trail,
    h.section_id ? sectionName.get(h.section_id) : "",
    (placed.get(h.id) ?? []).join("; "),
    h.walked_km,
    h.source,
    h.is_club_hike,
    h.club_link,
    h.hike_leader,
    h.hiked_with,
    h.start_point,
    h.end_point,
    h.link,
    h.notes,
    h.created_at,
  ]);

  const body = "﻿" + [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="white-blazes-hikes-${today}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
