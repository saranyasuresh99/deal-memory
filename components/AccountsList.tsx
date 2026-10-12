"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Briefcase, Copy, Clock, UserX } from "lucide-react";
import Badge, { type Tone } from "./Badge";
import { Avatar, Card, FilterSelect, KpiCard, th } from "./ui";
import { useRegisterExport } from "./shell/ExportContext";
import type { Account } from "@/lib/types";
import { formatShort, formatUsd } from "@/lib/format";
import { ownerMatches, useOwnerFilter, useStore } from "@/lib/store";
import { applyEdits, newLeadAccounts } from "@/lib/overlay";
import { hasNoOwner, isStale } from "@/lib/accounts";
import { TODAY } from "@/lib/config";

export type AccountRow = {
  account: Account;
  docCount: number;
  stale: boolean;
  noOwner: boolean;
  duplicate: "duplicate" | "possible_duplicate" | null;
};

type FilterKey = "all" | "duplicate" | "noOwner" | "stale";
type ViewRow = AccountRow & { edited: boolean; isNew: boolean };

export function statusTone(status: string | null): Tone {
  switch (status) {
    case "Won":
      return "rev";
    case "Lost":
      return "dq";
    case "Proposal Sent":
      return "brand";
    case "Contacted":
      return "wait";
    case "New":
      return "brand";
    default:
      return "warn";
  }
}

export default function AccountsList({ rows: baseRows }: { rows: AccountRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [owner, setOwner] = useOwnerFilter();
  const store = useStore();

  // Layer approved Debrief edits and new leads (from this browser) on top of the base CRM.
  const rows: ViewRow[] = useMemo(() => {
    const edited = baseRows.map((r) => {
      const a = applyEdits(r.account, store);
      return { ...r, account: a, stale: isStale(a), noOwner: hasNoOwner(a), edited: a !== r.account, isNew: false };
    });
    const fresh = newLeadAccounts(store).map((a) => ({
      account: a,
      docCount: 0,
      stale: false,
      noOwner: hasNoOwner(a),
      duplicate: null,
      edited: false,
      isNew: true,
    }));
    return [...fresh, ...edited];
  }, [baseRows, store]);

  const owners = [...new Set(rows.map((r) => r.account.owner).filter((o): o is string => !!o))].sort();
  const byOwner = rows.filter((r) => ownerMatches(owner, r.account.owner));
  const counts = {
    all: byOwner.length,
    duplicate: byOwner.filter((r) => r.duplicate).length,
    noOwner: byOwner.filter((r) => r.noOwner).length,
    stale: byOwner.filter((r) => r.stale).length,
  };

  const q = query.trim().toLowerCase();
  const shown = byOwner.filter((r) => {
    if (filter === "duplicate" && !r.duplicate) return false;
    if (filter === "noOwner" && !r.noOwner) return false;
    if (filter === "stale" && !r.stale) return false;
    if (!q) return true;
    const a = r.account;
    return [a.lead_id, a.company, a.contact_name, a.contact_email, a.owner, a.status].some((v) => v?.toLowerCase().includes(q));
  });

  useRegisterExport(`accounts-${TODAY}.csv`, () =>
    shown.map(({ account: a, docCount, stale, noOwner, duplicate, isNew }) => ({
      lead_id: a.lead_id,
      company: a.company,
      contact: a.contact_name ?? "",
      email: a.contact_email ?? "",
      status: a.status ?? "",
      owner: a.owner ?? "",
      est_value_usd: a.est_value_usd ?? "",
      last_contact: a.last_contact_date ?? "",
      docs: docCount,
      flags: [isNew && "new lead", duplicate?.replace("_", " "), noOwner && "no owner", stale && "stale"].filter(Boolean).join("; "),
    })),
  );

  const toggle = (k: FilterKey) => setFilter(filter === k ? "all" : k);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard icon={Briefcase} label="Accounts" value={counts.all} active={filter === "all"} onClick={() => setFilter("all")} />
        <KpiCard icon={Copy} label="Duplicates" value={counts.duplicate} active={filter === "duplicate"} onClick={() => toggle("duplicate")} />
        <KpiCard icon={UserX} label="No owner" value={counts.noOwner} active={filter === "noOwner"} onClick={() => toggle("noOwner")} />
        <KpiCard icon={Clock} label="Stale" value={counts.stale} active={filter === "stale"} onClick={() => toggle("stale")} />
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
          <h2 className="text-base font-semibold text-navy">All accounts</h2>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by company, contact, owner, lead ID…"
            aria-label="Filter accounts"
            className="min-w-0 flex-1 rounded-control border border-line px-3 py-1.5 text-sm placeholder:text-muted focus:border-brand focus:outline-none sm:max-w-xs"
          />
          <div className="ml-auto">
            <FilterSelect
              label="Owner"
              value={owner}
              onChange={setOwner}
              options={[{ value: "all", label: "All" }, ...owners.map((o) => ({ value: o, label: o })), { value: "none", label: "No owner" }]}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-b border-line bg-subtle">
              <tr>
                <th className={th}>Account</th>
                <th className={th}>Status</th>
                <th className={th}>Owner</th>
                <th className={th}>Last contact</th>
                <th className={`${th} text-right`}>Docs</th>
                <th className={`${th} text-right`}>Value</th>
                <th className={th}>Flags</th>
              </tr>
            </thead>
            <tbody>
              {shown.map(({ account: a, docCount, stale, noOwner, duplicate, edited, isNew }) => {
                const open = () => !isNew && router.push(`/accounts/${a.lead_id}`);
                return (
                  <tr
                    key={a.lead_id}
                    tabIndex={isNew ? -1 : 0}
                    onClick={open}
                    onKeyDown={(e) => e.key === "Enter" && open()}
                    className={`border-t border-line ${isNew ? "" : "cursor-pointer hover:bg-subtle"}`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink">{a.company}</div>
                      <div className="text-xs text-muted">
                        {a.lead_id} · {a.contact_name ?? <span className="text-warn-fg">contact needs input</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone(a.status)}>{a.status ?? "needs input"}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Avatar name={a.owner} />
                    </td>
                    <td className="px-4 py-3 text-ink">{formatShort(a.last_contact_date) ?? <span className="text-muted">never</span>}</td>
                    <td className="px-4 py-3 text-right text-ink">{docCount}</td>
                    <td className="px-4 py-3 text-right">
                      {a.est_value_usd !== null ? (
                        <span className="font-semibold text-navy">{formatUsd(a.est_value_usd)}</span>
                      ) : (
                        <span className="text-muted">value unknown</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {isNew && <Badge tone="rev">New lead (Debrief)</Badge>}
                        {edited && <Badge tone="brand">Updated via Debrief</Badge>}
                        {duplicate === "duplicate" && <Badge>Duplicate</Badge>}
                        {duplicate === "possible_duplicate" && <Badge>Possible duplicate</Badge>}
                        {noOwner && <Badge>No owner</Badge>}
                        {stale && <Badge>Stale</Badge>}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted">
                    No accounts match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
