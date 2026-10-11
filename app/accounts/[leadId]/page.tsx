import Link from "next/link";
import { notFound } from "next/navigation";
import AccountFields, { AccountStatusBadges } from "@/components/AccountFields";
import DocumentList from "@/components/DocumentList";
import BriefPanel from "@/components/BriefPanel";
import { accounts, documentsFor, getAccount } from "@/lib/data";
import { duplicatesFor, findDuplicates } from "@/lib/accounts";
import type { Account } from "@/lib/types";

export function generateStaticParams() {
  return accounts.map((a) => ({ leadId: a.lead_id }));
}

export default async function AccountPage({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params;
  const a = getAccount(leadId);
  if (!a) notFound();

  const docs = documentsFor(a.lead_id);
  const dupes = duplicatesFor(a.lead_id, findDuplicates(accounts));

  return (
    <div className="space-y-6">
      <Link href="/accounts" className="text-sm text-accent-600 hover:underline">
        ← All accounts
      </Link>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{a.company}</h1>
          <span className="text-sm text-slate-400">{a.lead_id}</span>
        </div>
        <AccountStatusBadges
          account={a}
          duplicateLabels={dupes.map((g) => (g.kind === "duplicate" ? "Duplicate" : "Possible duplicate"))}
        />
      </div>

      {dupes.map((g) => (
        <DuplicateNotice key={g.lead_ids.join()} current={a} group={g} />
      ))}

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">CRM record</h2>
        <AccountFields account={a} />
      </section>

      <BriefPanel leadId={a.lead_id} docs={docs} />

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Linked emails &amp; notes ({docs.length})
        </h2>
        <DocumentList docs={docs} leadId={a.lead_id} />
      </section>
    </div>
  );
}

function DuplicateNotice({ current, group }: { current: Account; group: { lead_ids: string[]; kind: string; reason: string } }) {
  const others = group.lead_ids.filter((id) => id !== current.lead_id).map((id) => getAccount(id)!);
  return (
    <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 text-sm">
      <div className="font-medium">
        {group.kind === "duplicate" ? "Likely the same client as " : "Possibly the same client as "}
        {others.map((o) => (
          <Link key={o.lead_id} href={`/accounts/${o.lead_id}`} className="text-accent-600 hover:underline">
            {o.company} ({o.lead_id}, owner {o.owner ?? "none"})
          </Link>
        ))}
      </div>
      <p className="mt-1 text-slate-600">{group.reason}</p>
      <p className="mt-1 text-slate-500">Records are never merged automatically — a person decides which to keep.</p>
    </div>
  );
}
