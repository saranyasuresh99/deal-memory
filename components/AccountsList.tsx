"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Badge from "./Badge";
import type { Account } from "@/lib/types";
import { formatDate, formatUsd } from "@/lib/format";

export type AccountRow = {
  account: Account;
  docCount: number;
  stale: boolean;
  noOwner: boolean;
  duplicate: "duplicate" | "possible_duplicate" | null;
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "duplicate", label: "Duplicates" },
  { key: "noOwner", label: "No owner" },
  { key: "stale", label: "Stale" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

export default function AccountsList({ rows }: { rows: AccountRow[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

  const counts: Record<FilterKey, number> = {
    all: rows.length,
    duplicate: rows.filter((r) => r.duplicate).length,
    noOwner: rows.filter((r) => r.noOwner).length,
    stale: rows.filter((r) => r.stale).length,
  };

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "duplicate" && !r.duplicate) return false;
      if (filter === "noOwner" && !r.noOwner) return false;
      if (filter === "stale" && !r.stale) return false;
      if (!q) return true;
      const a = r.account;
      return [a.lead_id, a.company, a.contact_name, a.contact_email, a.owner, a.status]
        .some((v) => v?.toLowerCase().includes(q));
    });
  }, [rows, query, filter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search company, contact, owner, lead ID…"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-accent-600 focus:outline-none sm:max-w-xs"
        />
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full border px-3 py-1 text-sm ${
                filter === f.key
                  ? "border-accent-600 bg-accent-50 text-accent-700"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {f.label} <span className="text-slate-400">{counts[f.key]}</span>
            </button>
          ))}
        </div>
      </div>

      <ul className="space-y-2">
        {shown.map(({ account: a, docCount, stale, noOwner, duplicate }) => (
          <li key={a.lead_id}>
            <Link
              href={`/accounts/${a.lead_id}`}
              className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-accent-600 hover:shadow"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{a.company}</span>
                    <span className="text-xs text-slate-400">{a.lead_id}</span>
                  </div>
                  <div className="mt-0.5 truncate text-sm text-slate-600">
                    {a.contact_name ?? <span className="italic text-amber-700">contact needs input</span>}
                    {a.service_interest && <span className="text-slate-400"> · {a.service_interest}</span>}
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="font-medium">
                    {formatUsd(a.est_value_usd) ?? <span className="font-normal text-slate-400">value unknown</span>}
                  </div>
                  <div className="text-slate-500">{a.status ?? <span className="italic text-amber-700">no status</span>}</div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                {noOwner ? <Badge>No owner</Badge> : <span>Owner: {a.owner}</span>}
                <span>· Last contact: {formatDate(a.last_contact_date) ?? "never"}</span>
                <span>· {docCount} doc{docCount === 1 ? "" : "s"}</span>
                {duplicate === "duplicate" && <Badge>Duplicate</Badge>}
                {duplicate === "possible_duplicate" && <Badge>Possible duplicate</Badge>}
                {stale && <Badge>Stale</Badge>}
              </div>
            </Link>
          </li>
        ))}
        {shown.length === 0 && <li className="py-8 text-center text-sm text-slate-500">No accounts match.</li>}
      </ul>
    </div>
  );
}
