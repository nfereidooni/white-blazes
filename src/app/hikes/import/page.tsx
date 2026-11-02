import { PageShell } from "@/components/PageShell";
import { GpxImport } from "./GpxImport";

export default function ImportPage() {
  return (
    <PageShell title="Import a GPX file">
      <GpxImport />
    </PageShell>
  );
}
