import PromisesClient from "@/components/PromisesClient";
import { PageHeader } from "@/components/ui";
import radarJson from "@/data/radar.json";
import { documents } from "@/lib/data";
import type { RadarFile } from "@/lib/schemas";

const radar = radarJson as RadarFile;

export default function PromisesPage() {
  const items = radar.items.filter((i) => i.type === "promise_overdue" || i.type === "promise_due");
  const cited = new Set(items.flatMap((i) => i.evidence.map((e) => e.file)));
  return (
    <div className="space-y-6">
      <PageHeader
        title="Promise Ledger"
        subtitle="Every commitment AtliQ made to a client — found in emails and notes, or added from an approved Debrief. Marking a Radar promise done here also marks it done on the Radar."
      />
      <PromisesClient items={items} docs={documents.filter((d) => cited.has(d.id))} />
    </div>
  );
}
