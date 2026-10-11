"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Badge from "./Badge";
import DocPanel from "./DocPanel";
import { updateStore, useStore } from "@/lib/store";
import { daysBetween } from "@/lib/accounts";
import { TODAY } from "@/lib/config";
import { formatDate } from "@/lib/format";
import type { RadarItem } from "@/lib/schemas";
import type { DocumentRecord } from "@/lib/types";

type Status = "open" | "overdue" | "done";

type Row = {
  id: string;
  kind: "radar" | "debrief";
  owner: string | null;
  account: string;
  leadId: string | null;
  what: string;
  dueDate: string | null;
  dateClear: boolean;
  daysOverdue: number | null;
  status: Status;
  source: { file: string; quote: string } | null; // null for debrief promises
  quote: string;
  extraSources: number;
  approvedOn?: string;
};

const STATUS_TONE = { overdue: "orange", open: "accent", done: "green" } as const;

export default function PromisesClient({ items, docs }: { items: RadarItem[]; docs: DocumentRecord[] }) {
  const store = useStore();
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [open, setOpen] = useState<{ doc: DocumentRecord; quote: string } | null>(null);
  const byId = useMemo(() => new Map(docs.map((d) => [d.id, d])), [docs]);

  const rows: Row[] = useMemo(() => {
    const fromRadar: Row[] = items.map((i) => {
      const overdue = i.type === "promise_overdue" || (i.days_overdue ?? 0) > 0;
      return {
        id: i.id,
        kind: "radar",
        owner: i.owner,
        account: i.account,
        leadId: i.lead_ids[0] ?? null,
        what: i.summary,
        dueDate: i.due_date,
        dateClear: i.date_clear,
        daysOverdue: i.days_overdue,
        status: store.radar[i.id]?.status === "done" ? "done" : overdue ? "overdue" : "open",
        source: i.evidence[0] ?? null,
        quote: i.evidence[0]?.quote ?? "",
        extraSources: Math.max(0, i.evidence.length - 1),
      };
    });
    const fromDebrief: Row[] = store.promises.map((p) => {
      const late = p.due_date ? daysBetween(p.due_date, TODAY) : null;
      return {
        id: p.id,
        kind: "debrief",
        owner: p.owner,
        account: p.account,
        leadId: p.lead_id,
        what: p.what,
        dueDate: p.due_date,
        dateClear: p.date_clear,
        daysOverdue: late !== null && late > 0 ? late : null,
        status: p.status === "done" ? "done" : late !== null && late > 0 ? "overdue" : "open",
        source: null,
        quote: p.quote,
        extraSources: 0,
        approvedOn: p.approved_on,
      };
    });
    const order = { overdue: 0, open: 1, done: 2 };
    return [...fromDebrief, ...fromRadar].sort(
      (a, b) =>
        order[a.status] - order[b.status] ||
        (b.daysOverdue ?? -1) - (a.daysOverdue ?? -1) ||
        (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"),
    );
  }, [items, store]);

  const owners = [...new Set(rows.map((r) => r.owner).filter((o): o is string => !!o))].sort();
  const count = (s: Status) => rows.filter((r) => r.status === s).length;
  const shown = rows.filter(
    (r) =>
      (statusFilter === "all" || r.status === statusFilter) &&
      (ownerFilter === "all" || (ownerFilter === "none" ? !r.owner : r.owner === ownerFilter)),
  );

  function setDone(r: Row, done: boolean) {
    updateStore((s) => {
      if (r.kind === "debrief") {
        return { ...s, promises: s.promises.map((p) => (p.id === r.id ? { ...p, status: done ? "done" : "open" } : p)) };
      }
      // Radar promises share their "done" state with the Radar card.
      const radar = { ...s.radar };
      if (done) radar[r.id] = { status: "done", at: TODAY };
      else delete radar[r.id];
      return { ...s, radar };
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2">
        {(["overdue", "open", "done"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
            className={`rounded-xl border p-3 text-left shadow-sm ${statusFilter === s ? "border-accent-600 bg-accent-50" : "border-slate-200 bg-white hover:border-slate-300"}`}
          >
            <div className={`text-2xl font-semibold ${s === "overdue" ? "text-orange-700" : s === "done" ? "text-emerald-700" : "text-accent-700"}`}>{count(s)}</div>
            <div className="text-xs text-slate-600 capitalize">{s}</div>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
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
          Showing {shown.length} of {rows.length}
        </span>
      </div>

      <ul className="space-y-3">
        {shown.map((r) => (
          <li key={r.id} className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${r.status === "done" ? "opacity-60" : ""}`}>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={STATUS_TONE[r.status]}>{r.status === "overdue" ? "Overdue" : r.status === "done" ? "Done" : "Open"}</Badge>
              {r.leadId && !r.leadId.startsWith("NEW-") ? (
                <Link href={`/accounts/${r.leadId}`} className="font-medium hover:text-accent-700 hover:underline">
                  {r.account}
                </Link>
              ) : (
                <span className="font-medium">{r.account}</span>
              )}
              <span className="ml-auto text-sm text-slate-700">
                {r.dueDate ? (
                  <>
                    Due {formatDate(r.dueDate)}
                    {r.daysOverdue ? <span className="font-medium text-orange-700"> · {r.daysOverdue} days overdue</span> : null}
                  </>
                ) : (
                  <span className="font-medium text-amber-700">{r.dateClear ? "No date given" : "Date unclear"}</span>
                )}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-800">{r.what}</p>
            <div className="mt-2 border-l-2 border-slate-200 pl-3 text-xs">
              <span className="text-slate-500 italic">“{r.quote}”</span>{" "}
              {r.source && byId.has(r.source.file) ? (
                <button onClick={() => setOpen({ doc: byId.get(r.source!.file)!, quote: r.source!.quote })} className="text-accent-600 hover:underline">
                  {r.source.file}
                </button>
              ) : r.kind === "debrief" ? (
                <span className="text-slate-400">Debrief, approved {formatDate(r.approvedOn ?? null)}</span>
              ) : (
                <span className="text-slate-400">{r.source?.file}</span>
              )}
              {r.extraSources > 0 && <span className="text-slate-400"> · +{r.extraSources} more on the Radar</span>}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              {r.owner ? <span>Owner: {r.owner}</span> : <Badge>No owner</Badge>}
              <span>· {r.kind === "debrief" ? "From Debrief" : "From Radar"}</span>
              <button
                onClick={() => setDone(r, r.status !== "done")}
                className={`ml-auto rounded-md px-2.5 py-1 font-medium ${r.status === "done" ? "border border-slate-300 text-slate-700 hover:bg-slate-50" : "bg-accent-600 text-white hover:bg-accent-700"}`}
              >
                {r.status === "done" ? "Undo" : "Mark done"}
              </button>
            </div>
          </li>
        ))}
        {shown.length === 0 && <li className="py-10 text-center text-sm text-slate-500">No promises here.</li>}
      </ul>

      <DocPanel doc={open?.doc ?? null} highlight={open?.quote} onClose={() => setOpen(null)} />
    </div>
  );
}
