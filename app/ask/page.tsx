import AskClient from "@/components/AskClient";
import answers from "@/data/precomputed/answers.json";
import { documents } from "@/lib/data";

export default function AskPage() {
  const examples = answers.questions.filter((q) => q.example).map((q) => q.question);
  const more = answers.questions.filter((q) => !q.example).map((q) => q.question);
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ask</h1>
        <p className="mt-1 text-sm text-slate-600">
          Questions about clients and deals, answered only from the CRM, emails and meeting notes — every point is cited. If the
          data doesn’t say, it will tell you so.
        </p>
      </div>
      <AskClient examples={examples} more={more} docs={documents} />
    </div>
  );
}
