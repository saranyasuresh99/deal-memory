"use client";

// Account card: CRM record for one account, with approved Debrief edits (from this browser) layered on top.
import Badge from "./Badge";
import { Card } from "./ui";
import { statusTone } from "./AccountsList";
import { useStore } from "@/lib/store";
import { applyEdits } from "@/lib/overlay";
import { daysAgo, hasNoOwner, isStale } from "@/lib/accounts";
import { agoText, formatDate, formatUsd } from "@/lib/format";
import type { Account } from "@/lib/types";

const NEEDS_INPUT = <span className="text-warn-fg">needs input</span>;

export default function AccountFields({ account, duplicateLabels }: { account: Account; duplicateLabels: string[] }) {
  const store = useStore();
  const a = applyEdits(account, store);
  const edited = store.accountEdits[account.lead_id] ?? {};

  const fields: [keyof Account, string, React.ReactNode][] = [
    ["contact_name", "Contact", a.contact_name ?? NEEDS_INPUT],
    ["contact_email", "Email", a.contact_email ?? NEEDS_INPUT],
    ["owner", "Owner", a.owner ?? <span className="text-warn-fg">No owner</span>],
    ["status", "Status", a.status ? <Badge tone={statusTone(a.status)}>{a.status}</Badge> : NEEDS_INPUT],
    ["est_value_usd", "Est. value", formatUsd(a.est_value_usd) ?? <span className="text-muted">value unknown</span>],
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
      <span className="ml-1 text-xs text-brand" title={`Approved in Debrief (was: ${account[k] ?? "empty"})`}>
        · updated
      </span>
    ) : null;

  return (
    <Card className="p-5">
      <h1 className="text-xl font-semibold text-navy">{a.company}</h1>
      <div className="mt-0.5 text-sm text-muted">{a.lead_id}</div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {hasNoOwner(a) && <Badge>No owner</Badge>}
        {isStale(a) && <Badge>Stale</Badge>}
        {duplicateLabels.map((l, i) => (
          <Badge key={i}>{l}</Badge>
        ))}
      </div>
      <dl className="mt-4 divide-y divide-line border-t border-line">
        {fields.map(([key, label, value]) => (
          <div key={key} className="flex items-start justify-between gap-3 py-2">
            <dt className="shrink-0 text-xs text-muted">
              {label}
              {mark(key)}
            </dt>
            <dd className="min-w-0 text-right text-sm break-words text-ink">{value}</dd>
          </div>
        ))}
        <div className="py-2">
          <dt className="text-xs text-muted">
            CRM notes
            {mark("notes")}
          </dt>
          <dd className="mt-1 text-sm text-ink">{a.notes ?? <span className="text-muted">empty</span>}</dd>
        </div>
      </dl>
    </Card>
  );
}
