import AskClient from "@/components/AskClient";
import { PageHeader } from "@/components/ui";
import answers from "@/data/precomputed/answers.json";
import { documents } from "@/lib/data";

export default function AskPage() {
  const examples = answers.questions.filter((q) => q.example).map((q) => q.question);
  const more = answers.questions.filter((q) => !q.example).map((q) => q.question);
  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-3xl">
        <PageHeader
          title="Ask"
          subtitle="Questions about clients and deals, answered only from the CRM, emails and meeting notes — every point is cited. If the data doesn't say, it will tell you so."
        />
      </div>
      <AskClient examples={examples} more={more} docs={documents} />
    </div>
  );
}
