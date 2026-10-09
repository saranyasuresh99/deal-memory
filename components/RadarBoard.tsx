"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Badge from "./Badge";
import DocPanel from "./DocPanel";
import { TYPE_META } from "@/lib/radar-meta";
import { updateStore, useStore, type RadarAction } from "@/lib/store";
import { TODAY } from "@/lib/config";
import { formatDate, formatUsd } from "@/lib/format";
import type { RadarItem, RadarType } from "@/lib/schemas";
import type { DocumentRecord } from "@/lib/types";

type Counter = { key: string; label: (n: number) => string; types: RadarType[]; tone: string };

const COUNTERS: Counter[] = [
  { key: "waiting", label: (n) => `client${n === 1 ? "" : "s"} waiting on us`, types: ["waiting_on_us"], tone: "text-red-700" },
  { key: "promises", label: (n) => `overdue promise${n === 1 ? "" : "s"}`, types: ["promise_overdue"], tone: "text-orange-700" },
  { key: "deadlines", label: (n) => `client deadline${n === 1 ? "" : "s"}`, types: ["client_deadline", "promise_due"], tone: "text-amber-700" },
  { key: "opps", label: (n) => `opportunit${n === 1 ? "y" : "ies"}`, types: ["cross_sell", "referral", "revisit_due", "returning_lost"], tone: "text-emerald-700" },
  { key: "data", label: (n) => `data-quality issue${n === 1 ? "" : "s"}`, types: ["contradiction", "stale_deal", "no_owner", "missing_next_step", "lead_missing", "possible_duplicate"], tone: "text-slate-700" },
];

function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function isHidden(a: RadarAction | undefined): boolean {
  if (!a) return false;
  if (a.status === "snoozed") return !!a.until && a.until > TODAY;
  return true;
}

export default function RadarBoard({ items, docs }: { items: RadarItem[]; docs: DocumentRecord[] }) {
  const store = useStore();
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [showHidden, setShowHidden] = useState(false);
  const [openDoc, setOpenDoc] = useState<{ doc: DocumentRecord; quote: string } | null>(null);

  const docById = useMemo(() => new Map(docs.map((d) => [d.id, d])), [docs]);
  const owners = useMemo(() => [...new Set(items.map((i) => i.owner).filter((o): o is string => !!o))].sort(), [items]);
  const types = useMemo(() => [...new Set(items.map((i) => i.type))], [items]);

  const visible = items.filter((i) => !isHidden(store.radar[i.id]));
  const hiddenCount = items.length - visible.length;

  const shown = (showHidden ? items.filter((i) => isHidden(store.radar[i.id])) : visible).filter((i) => {
    if (typeFilter.startsWith("group:")) {
      const c = COUNTERS.find((c) => c.key === typeFilter.slice(6));
      if (c && !c.types.includes(i.type)) return false;
    } else if (typeFilter !== "all" && i.type !== typeFilter) return false;
    if (ownerFilter === "none" && i.owner) return false;
    if (ownerFilter !== "all" && ownerFilter !== "none" && i.owner !== ownerFilter) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Summary counters (click to filter) */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {COUNTERS.map((c) => {
          const n = visible.filter((i) => c.types.includes(i.type)).length;
          const active = typeFilter === `group:${c.key}`;
          return (
            <button
              key={c.key}
              onClick={() => setTypeFilter(active ? "all" : `group:${c.key}`)}
              className={`rounded-xl border p-3 text-left shadow-sm transition ${active ? "border-accent-600 bg-accent-50" : "border-slate-200 bg-white hover:border-slate-300"}`}
            >
              <div className={`text-2xl font-semibold ${c.tone}`}>{n}</div>
              <div className="text-xs leading-tight text-slate-600">{c.label(n)}</div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5">
          <option value="all">All types</option>
          {COUNTERS.map((c) => (
            <option key={c.key} value={`group:${c.key}`}>
              All: {c.label(2)}
            </option>
          ))}
          {types.map((t) => (
            <option key={t} value={t}>
              {TYPE_META[t].label}
            </option>
          ))}
        </select>
        <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5">
          <option value="all">All owners</option>
          {owners.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
          <option value="none">No owner</option>
        </select>
        <span className="text-slate-500">
          Showing {shown.length} of {showHidden ? hiddenCount : visible.length}
        </span>
        {(hiddenCount > 0 || showHidden) && (
          <button onClick={() => setShowHidden(!showHidden)} className="ml-auto text-accent-600 hover:underline">
            {showHidden ? "← Back to active items" : `Show done / snoozed / dismissed (${hiddenCount})`}
          </button>
        )}
      </div>

      <ol className="space-y-3">
        {shown.map((item, idx) => (
          <RadarCard
            key={item.id}
            rank={showHidden ? null : idx + 1}
            item={item}
            action={store.radar[item.id]}
            docById={docById}
            onOpenDoc={(doc, quote) => setOpenDoc({ doc, quote })}
          />
        ))}
        {shown.length === 0 && <li className="py-10 text-center text-sm text-slate-500">Nothing here.</li>}
      </ol>

      <DocPanel doc={openDoc?.doc ?? null} highlight={openDoc?.quote} onClose={() => setOpenDoc(null)} />
    </div>
  );
}

function RadarCard({
  rank,
  item,
  action,
  docById,
  onOpenDoc,
}: {
  rank: number | null;
  item: RadarItem;
  action: RadarAction | undefined;
  docById: Map<string, DocumentRecord>;
  onOpenDoc: (doc: DocumentRecord, quote: string) => void;
}) {
  const [mode, setMode] = useState<"idle" | "snooze" | "dismiss">("idle");
  const [until, setUntil] = useState(addDays(TODAY, 7));
  const [reason, setReason] = useState("");
  const [allEvidence, setAllEvidence] = useState(false);
  const meta = TYPE_META[item.type];
  const evidence = allEvidence ? item.evidence : item.evidence.slice(0, 1);

  const act = (a: RadarAction | null) =>
    updateStore((s) => {
      const radar = { ...s.radar };
      if (a) radar[item.id] = a;
      else delete radar[item.id];
      return { ...s, radar };
    });

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        {rank !== null && <span className="text-xs font-semibold text-slate-400">#{rank}</span>}
        <Badge tone={meta.tone}>{meta.label}</Badge>
        {item.lead_ids.length === 1 ? (
          <Link href={`/accounts/${item.lead_ids[0]}`} className="font-medium hover:text-accent-700 hover:underline">
            {item.account}
          </Link>
        ) : (
          <span className="font-medium">{item.account}</span>
        )}
        <span className="text-sm text-slate-600">
          {item.value_usd !== null ? formatUsd(item.value_usd) : <span className="text-slate-400">value unknown</span>}
        </span>
        {item.urgency_text && <span className="ml-auto text-sm font-medium text-slate-700">{item.urgency_text}</span>}
      </div>

      <p className="mt-2 text-sm text-slate-800">{item.summary}</p>

      <div className="mt-3 space-y-2">
        {evidence.map((e) => {
          const doc = docById.get(e.file);
          return (
            <figure key={e.file + e.quote} className="border-l-2 border-slate-200 pl-3">
              <blockquote className="line-clamp-3 text-sm text-slate-600 italic">“{e.quote}”</blockquote>
              <figcaption className="mt-0.5 text-xs">
                {doc ? (
                  <button onClick={() => onOpenDoc(doc, e.quote)} className="text-accent-600 hover:underline">
                    {e.file}
                  </button>
                ) : e.file === "crm_export.csv" && item.lead_ids.length >= 1 && item.lead_ids.length <= 2 ? (
                  <span className="text-slate-500">
                    CRM record ·{" "}
                    {item.lead_ids.map((id) => (
                      <Link key={id} href={`/accounts/${id}`} className="mr-1 text-accent-600 hover:underline">
                        {id}
                      </Link>
                    ))}
                  </span>
                ) : (
                  <span className="text-slate-500">{e.file}</span>
                )}
              </figcaption>
            </figure>
          );
        })}
        {item.evidence.length > 1 && (
          <button onClick={() => setAllEvidence(!allEvidence)} className="text-xs text-slate-500 hover:underline">
            {allEvidence ? "Show less" : `+${item.evidence.length - 1} more source${item.evidence.length > 2 ? "s" : ""}`}
          </button>
        )}
      </div>

      <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
        <span className="font-medium text-slate-700">Next: </span>
        {item.suggested_next_action}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        {item.owner ? <span>Owner: {item.owner}</span> : <Badge>No owner</Badge>}
        <span>· {item.source === "ai" ? "AI signal (quote verified)" : "Rule"}</span>

        <div className="ml-auto flex flex-wrap gap-2">
          {action ? (
            <>
              <span className="self-center text-slate-600">
                {action.status === "done" && "Marked done"}
                {action.status === "snoozed" && `Snoozed until ${formatDate(action.until ?? null)}`}
                {action.status === "dismissed" && `Dismissed: ${action.reason}`}
              </span>
              <button onClick={() => act(null)} className="rounded-md border border-slate-300 px-2.5 py-1 text-slate-700 hover:bg-slate-50">
                Restore
              </button>
            </>
          ) : (
            mode === "idle" && (
              <>
                <button onClick={() => act({ status: "done", at: TODAY })} className="rounded-md bg-accent-600 px-2.5 py-1 font-medium text-white hover:bg-accent-700">
                  Done
                </button>
                <button onClick={() => setMode("snooze")} className="rounded-md border border-slate-300 px-2.5 py-1 text-slate-700 hover:bg-slate-50">
                  Snooze
                </button>
                <button onClick={() => setMode("dismiss")} className="rounded-md border border-slate-300 px-2.5 py-1 text-slate-700 hover:bg-slate-50">
                  Dismiss
                </button>
              </>
            )
          )}
        </div>
      </div>

      {!action && mode === "snooze" && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <label className="text-slate-600">Snooze until</label>
          <input type="date" min={addDays(TODAY, 1)} value={until} onChange={(e) => setUntil(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1" />
          <button
            disabled={!until || until <= TODAY}
            onClick={() => act({ status: "snoozed", until, at: TODAY })}
            className="rounded-md bg-accent-600 px-2.5 py-1 font-medium text-white disabled:opacity-40"
          >
            Snooze
          </button>
          <button onClick={() => setMode("idle")} className="text-slate-500 hover:underline">
            Cancel
          </button>
        </div>
      )}

      {!action && mode === "dismiss" && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <input
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why dismiss? (required)"
            className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1"
          />
          <button
            disabled={reason.trim().length === 0}
            onClick={() => act({ status: "dismissed", reason: reason.trim(), at: TODAY })}
            className="rounded-md bg-accent-600 px-2.5 py-1 font-medium text-white disabled:opacity-40"
          >
            Dismiss
          </button>
          <button onClick={() => setMode("idle")} className="text-slate-500 hover:underline">
            Cancel
          </button>
        </div>
      )}
    </li>
  );
}
