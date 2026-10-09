import Link from "next/link";
import { notFound } from "next/navigation";
import Badge from "@/components/Badge";
import DocumentList from "@/components/DocumentList";
import { accounts, documentsFor, getAccount } from "@/lib/data";
import { daysAgo, duplicatesFor, findDuplicates, hasNoOwner, isStale } from "@/lib/accounts";
import { agoText, formatDate, formatUsd } from "@/lib/format";
import type { Account } from "@/lib/types";

export function generateStaticParams() {
  return accounts.map((a) => ({ leadId: a.lead_id }));
}

const NEEDS_INPUT = <span className="italic text-amber-700">needs input</span>;

export default async function AccountPage({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params;
  const a = getAccount(leadId);
  if (!a) notFound();

  const docs = documentsFor(a.lead_id);
  const dupes = duplicatesFor(a.lead_id, findDuplicates(accounts));

  const fields: [string, React.ReactNode][] = [
    ["Contact", a.contact_name ?? NEEDS_INPUT],
    ["Email", a.contact_email ?? NEEDS_INPUT],
    ["Status", a.status ?? NEEDS_INPUT],
    ["Est. value", formatUsd(a.est_value_usd) ?? <span className="italic text-slate-500">value unknown</span>],
    ["Owner", a.owner ?? <span className="italic text-amber-700">No owner</span>],
    ["Service interest", a.service_interest ?? NEEDS_INPUT],
    ["Source", a.source ?? NEEDS_INPUT],
    ["Created", formatDate(a.created_date) ?? NEEDS_INPUT],
    [
      "Last contact",
      a.last_contact_date ? `${formatDate(a.last_contact_date)} (${agoText(daysAgo(a.last_contact_date))})` : NEEDS_INPUT,
    ],
    ["Next follow-up", formatDate(a.next_followup_date) ?? NEEDS_INPUT],
  ];

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
        <div className="mt-2 flex flex-wrap gap-2">
          {hasNoOwner(a) && <Badge>No owner</Badge>}
          {isStale(a) && <Badge>Stale</Badge>}
          {dupes.map((g) => (
            <Badge key={g.lead_ids.join()}>{g.kind === "duplicate" ? "Duplicate" : "Possible duplicate"}</Badge>
          ))}
        </div>
      </div>

      {dupes.map((g) => (
        <DuplicateNotice key={g.lead_ids.join()} current={a} group={g} />
      ))}

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">CRM record</h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 rounded-xl border border-slate-200 p-4 shadow-sm sm:grid-cols-2">
          {fields.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-slate-500">{label}</dt>
              <dd className="text-sm break-words">{value}</dd>
            </div>
          ))}
          <div className="sm:col-span-2">
            <dt className="text-xs text-slate-500">CRM notes</dt>
            <dd className="text-sm">{a.notes ?? <span className="italic text-slate-400">empty</span>}</dd>
          </div>
        </dl>
      </section>

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
