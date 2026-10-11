"use client";

// CRM record for one account, with approved Debrief edits (from this browser) layered on top.
import Badge from "./Badge";
import { useStore } from "@/lib/store";
import { applyEdits } from "@/lib/overlay";
import { daysAgo, hasNoOwner, isStale } from "@/lib/accounts";
import { agoText, formatDate, formatUsd } from "@/lib/format";
import type { Account } from "@/lib/types";

const NEEDS_INPUT = <span className="italic text-amber-700">needs input</span>;

export function AccountStatusBadges({ account, duplicateLabels }: { account: Account; duplicateLabels: string[] }) {
  const a = applyEdits(account, useStore());
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {hasNoOwner(a) && <Badge>No owner</Badge>}
      {isStale(a) && <Badge>Stale</Badge>}
      {duplicateLabels.map((l, i) => (
        <Badge key={i}>{l}</Badge>
      ))}
    </div>
  );
}

export default function AccountFields({ account }: { account: Account }) {
  const store = useStore();
  const a = applyEdits(account, store);
  const edited = store.accountEdits[account.lead_id] ?? {};

  const fields: [keyof Account, string, React.ReactNode][] = [
    ["contact_name", "Contact", a.contact_name ?? NEEDS_INPUT],
    ["contact_email", "Email", a.contact_email ?? NEEDS_INPUT],
    ["status", "Status", a.status ?? NEEDS_INPUT],
    ["est_value_usd", "Est. value", formatUsd(a.est_value_usd) ?? <span className="italic text-slate-500">value unknown</span>],
    ["owner", "Owner", a.owner ?? <span className="italic text-amber-700">No owner</span>],
    ["service_interest", "Service interest", a.service_interest ?? NEEDS_INPUT],
    ["source", "Source", a.source ?? NEEDS_INPUT],
    ["created_date", "Created", formatDate(a.created_date) ?? NEEDS_INPUT],
    [
      "last_contact_date",
      "Last contact",
      a.last_contact_date ? `${formatDate(a.last_contact_date)} (${agoText(daysAgo(a.last_contact_date))})` : NEEDS_INPUT,
    ],
    ["next_followup_date", "Next follow-up", formatDate(a.next_followup_date) ?? NEEDS_INPUT],
  ];

  const mark = (k: keyof Account) =>
    k in edited ? (
      <span className="ml-1 text-xs text-accent-700" title={`Approved in Debrief (was: ${account[k] ?? "empty"})`}>
        · updated
      </span>
    ) : null;

  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 rounded-xl border border-slate-200 p-4 shadow-sm sm:grid-cols-2">
      {fields.map(([key, label, value]) => (
        <div key={key}>
          <dt className="text-xs text-slate-500">
            {label}
            {mark(key)}
          </dt>
          <dd className="text-sm break-words">{value}</dd>
        </div>
      ))}
      <div className="sm:col-span-2">
        <dt className="text-xs text-slate-500">
          CRM notes
          {mark("notes")}
        </dt>
        <dd className="text-sm">{a.notes ?? <span className="italic text-slate-400">empty</span>}</dd>
      </div>
    </dl>
  );
}
