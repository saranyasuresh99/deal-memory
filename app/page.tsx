import RadarView from "@/components/radar/RadarView";
import { PageHeader } from "@/components/ui";
import radarJson from "@/data/radar.json";
import { accounts, documents, documentsFor } from "@/lib/data";
import { accountKey } from "@/lib/radar-view";
import { timelineFor, type TimelineEvent } from "@/lib/timeline";
import type { RadarFile } from "@/lib/schemas";

const radar = radarJson as RadarFile;

export default function RadarPage() {
  // Memory timeline per account on the Radar (built from documents and CRM dates — no AI).
  const timelines: Record<string, TimelineEvent[]> = {};
  for (const i of radar.items) {
    const key = accountKey(i);
    if (key in timelines) continue;
    if (i.lead_ids.length === 1) {
      const a = accounts.find((x) => x.lead_id === i.lead_ids[0]) ?? null;
      timelines[key] = timelineFor(a, documentsFor(i.lead_ids[0])).slice(0, 4);
    } else if (i.lead_ids.length === 0) {
      timelines[key] = timelineFor(null, documents.filter((d) => d.unmatched_companies.includes(i.account))).slice(0, 4);
    }
  }

  // Ship only the documents the page can open (evidence + timeline entries).
  const needed = new Set([
    ...radar.items.flatMap((i) => i.evidence.map((e) => e.file)),
    ...Object.values(timelines).flatMap((t) => t.map((e) => e.docId).filter((x): x is string => !!x)),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Revenue Leak Radar"
        subtitle="Every client waiting on us, promise and hidden deal, ranked by value and urgency. Each one cites its source."
      />
      <RadarView items={radar.items} docs={documents.filter((d) => needed.has(d.id))} accounts={accounts} timelines={timelines} />
    </div>
  );
}
