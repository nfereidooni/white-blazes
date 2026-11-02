import { PageShell } from "@/components/PageShell";
import { ImportChooser } from "./ImportChooser";

export default async function ImportPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await searchParams;
  return (
    <PageShell title="Import hikes" eyebrow="Hikes" tab="hikes">
      <ImportChooser initial={from === "strava" ? "strava" : "gpx"} />
    </PageShell>
  );
}
