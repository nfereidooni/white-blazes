import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * The trail line as GeoJSON, for drawing on maps. It's public OpenStreetMap
 * data that changes only when a migration updates it, so browsers and CDNs
 * may cache it for a day.
 */
export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("trail_geojson");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" },
  });
}
