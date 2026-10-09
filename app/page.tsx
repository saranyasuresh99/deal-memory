import RadarBoard from "@/components/RadarBoard";
import radarJson from "@/data/radar.json";
import { documents } from "@/lib/data";
import { formatDate } from "@/lib/format";
import type { RadarFile } from "@/lib/schemas";

const radar = radarJson as RadarFile;

export default function RadarPage() {
  // Only ship the documents that cards cite as evidence.
  const cited = new Set(radar.items.flatMap((i) => i.evidence.map((e) => e.file)));
  const docs = documents.filter((d) => cited.has(d.id));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Revenue Leak Radar</h1>
        <p className="mt-1 text-sm text-slate-600">
          Ranked by deal value × urgency, as of {formatDate(radar.today)}. Every card cites the email, note or CRM row it
          comes from — click the file name to read it.
        </p>
      </div>
      <RadarBoard items={radar.items} docs={docs} />
    </div>
  );
}
