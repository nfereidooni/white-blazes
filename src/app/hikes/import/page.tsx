import { PageShell } from "@/components/PageShell";
import { ImportChooser } from "./ImportChooser";
import { StravaSyncNote } from "./StravaSyncNote";

export default async function ImportPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await searchParams;
  return (
    <PageShell title="Import hikes" eyebrow="Hike log" tab="hikes">
      <ImportChooser initial={from === "strava" ? "strava" : "gpx"} />
      <StravaSyncNote />
    </PageShell>
  );
}
