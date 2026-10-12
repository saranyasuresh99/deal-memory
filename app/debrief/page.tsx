import DebriefClient, { type Sample } from "@/components/debrief/DebriefClient";
import samplesJson from "@/data/samples.json";
import { accounts } from "@/lib/data";
import { findDuplicates } from "@/lib/accounts";
import { PageHeader } from "@/components/ui";

export default function DebriefPage() {
  const duplicatePairs = findDuplicates(accounts).map((g) => g.lead_ids);
  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-3xl">
        <PageHeader
          title="Debrief"
          subtitle="Just off a call? Speak or paste a quick note. The AI proposes a CRM update — you approve, edit or reject each field."
        />
      </div>
      <DebriefClient samples={samplesJson as Sample[]} accounts={accounts} duplicatePairs={duplicatePairs} />
    </div>
  );
}
