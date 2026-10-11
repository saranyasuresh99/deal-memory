import DebriefClient, { type Sample } from "@/components/debrief/DebriefClient";
import samplesJson from "@/data/samples.json";
import { accounts } from "@/lib/data";
import { findDuplicates } from "@/lib/accounts";

export default function DebriefPage() {
  const duplicatePairs = findDuplicates(accounts).map((g) => g.lead_ids);
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Debrief</h1>
        <p className="mt-1 text-sm text-slate-600">
          Just off a call? Speak or paste a quick note. The AI proposes a CRM update — you approve, edit or reject each field.
        </p>
      </div>
      <DebriefClient samples={samplesJson as Sample[]} accounts={accounts} duplicatePairs={duplicatePairs} />
    </div>
  );
}
