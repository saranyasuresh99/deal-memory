"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import DocPanel from "./DocPanel";
import { Avatar, Card, FilterSelect, GroupHeader, th } from "./ui";
import { useRegisterExport } from "./shell/ExportContext";
import { ownerMatches, updateStore, useOwnerFilter, useStore } from "@/lib/store";
import { daysBetween } from "@/lib/accounts";
import { TODAY } from "@/lib/config";
import { formatShort, weekday } from "@/lib/format";
import type { RadarItem } from "@/lib/schemas";
import type { DocumentRecord } from "@/lib/types";

type Status = "open" | "overdue" | "done";
type GroupKey = "overdue" | "soon" | "unclear" | "done";

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

const GROUPS: { key: GroupKey; title: string; dot: string; collapsed: boolean }[] = [
  { key: "overdue", title: "Overdue", dot: "bg-navy", collapsed: false },
  { key: "soon", title: "Due soon", dot: "bg-[#e0a100]", collapsed: false },
  { key: "unclear", title: "Date unclear", dot: "bg-[#f2cf7a]", collapsed: false },
  { key: "done", title: "Done", dot: "bg-rev-fg", collapsed: true },
];

const TOP_N = 5;

function groupOf(r: Row): GroupKey {
  if (r.status === "done") return "done";
  if (r.status === "overdue") return "overdue";
  return r.dueDate ? "soon" : "unclear";
}

export default function PromisesClient({ items, docs }: { items: RadarItem[]; docs: DocumentRecord[] }) {
  const store = useStore();
  const [owner, setOwner] = useOwnerFilter();
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
    return [...fromDebrief, ...fromRadar].sort(
      (a, b) => (b.daysOverdue ?? -1) - (a.daysOverdue ?? -1) || (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"),
    );
  }, [items, store]);

  const owners = [...new Set(rows.map((r) => r.owner).filter((o): o is string => !!o))].sort();
  const shown = rows.filter((r) => ownerMatches(owner, r.owner));

  useRegisterExport(`promises-${TODAY}.csv`, () =>
    shown.map((r) => ({
      status: r.status,
      promise: r.what,
      client: r.account,
      lead_id: r.leadId ?? "",
      owner: r.owner ?? "",
      due_date: r.dueDate ?? (r.dateClear ? "no date given" : "date unclear"),
      days_overdue: r.daysOverdue ?? "",
      source: r.source?.file ?? (r.kind === "debrief" ? "debrief" : ""),
      quote: r.quote,
    })),
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
    <>
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
          <h2 className="text-base font-semibold text-navy">Promises</h2>
          <span className="text-sm text-muted">
            {shown.filter((r) => r.status === "overdue").length} overdue · {shown.filter((r) => r.status === "open").length} open ·{" "}
            {shown.filter((r) => r.status === "done").length} done
          </span>
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
          <table className="w-full min-w-[860px] text-sm">
            <thead className="border-b border-line bg-subtle">
              <tr>
                <th className={th}>Promise</th>
                <th className={th}>Client</th>
                <th className={th}>Owner</th>
                <th className={th}>Due</th>
                <th className={th}>Source</th>
                <th className={th}>
                  <span className="sr-only">Action</span>
                </th>
              </tr>
            </thead>
            {GROUPS.map((g) => {
              const groupRows = shown.filter((r) => groupOf(r) === g.key);
              if (groupRows.length === 0) return null;
              return (
                <PromiseGroup
                  key={g.key}
                  group={g}
                  rows={groupRows}
                  byId={byId}
                  onOpen={(doc, quote) => setOpen({ doc, quote })}
                  onDone={setDone}
                />
              );
            })}
          </table>
          {shown.length === 0 && <p className="px-4 py-10 text-center text-sm text-muted">No promises here.</p>}
        </div>
      </Card>
      <DocPanel doc={open?.doc ?? null} highlight={open?.quote} onClose={() => setOpen(null)} />
    </>
  );
}

function PromiseGroup({
  group,
  rows,
  byId,
  onOpen,
  onDone,
}: {
  group: (typeof GROUPS)[number];
  rows: Row[];
  byId: Map<string, DocumentRecord>;
  onOpen: (doc: DocumentRecord, quote: string) => void;
  onDone: (r: Row, done: boolean) => void;
}) {
  const [open, setOpen] = useState(!group.collapsed);
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? rows : rows.slice(0, TOP_N);
  const rest = rows.length - TOP_N;

  return (
    <tbody className="border-b border-line last:border-b-0">
      <tr>
        <td colSpan={6} className="p-0">
          {group.collapsed ? (
            <button onClick={() => setOpen(!open)} aria-expanded={open} className="w-full text-left hover:bg-subtle">
              <GroupHeader dot={group.dot} title={group.title} count={`${rows.length} · ${open ? "hide" : "show"}`} />
            </button>
          ) : (
            <GroupHeader dot={group.dot} title={group.title} count={rows.length} />
          )}
        </td>
      </tr>
      {open &&
        visible.map((r) => (
          <tr key={r.id} className={`border-t border-line ${r.status === "done" ? "text-muted" : ""}`}>
            <td className="max-w-[340px] px-4 py-3">
              <div className={r.status === "done" ? "text-muted line-through" : "text-ink"}>{r.what}</div>
              <div className="mt-0.5 line-clamp-1 text-xs text-muted">“{r.quote}”</div>
            </td>
            <td className="px-4 py-3">
              {r.leadId && !r.leadId.startsWith("NEW-") ? (
                <Link href={`/accounts/${r.leadId}`} className="font-medium text-ink hover:text-brand">
                  {r.account}
                </Link>
              ) : (
                <span className="font-medium text-ink">{r.account}</span>
              )}
              <div className="text-xs text-muted">{r.leadId ?? "not in CRM"}</div>
            </td>
            <td className="px-4 py-3">
              <Avatar name={r.owner} />
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
              {r.dueDate ? (
                <>
                  <div className="text-ink">
                    {weekday(r.dueDate)} {formatShort(r.dueDate)}
                  </div>
                  <div className={`text-xs ${r.daysOverdue ? "font-medium text-warn-fg" : "text-muted"}`}>
                    {r.daysOverdue
                      ? `${r.daysOverdue} days overdue`
                      : daysBetween(TODAY, r.dueDate) === 0
                        ? "due today"
                        : `${daysBetween(TODAY, r.dueDate)} days left`}
                  </div>
                </>
              ) : (
                <span className="font-medium text-warn-fg">{r.dateClear ? "No date given" : "Date unclear"}</span>
              )}
            </td>
            <td className="px-4 py-3 text-xs">
              {r.source && byId.has(r.source.file) ? (
                <button onClick={() => onOpen(byId.get(r.source!.file)!, r.source!.quote)} className="text-left font-medium text-brand hover:underline">
                  {byId.get(r.source.file)!.type === "email" ? "Email" : "Meeting note"} · {formatShort(byId.get(r.source.file)!.date)}
                </button>
              ) : r.kind === "debrief" ? (
                <span className="text-muted">Debrief · approved {formatShort(r.approvedOn ?? null)}</span>
              ) : (
                <span className="text-muted">{r.source?.file}</span>
              )}
              {r.extraSources > 0 && <div className="text-muted">+{r.extraSources} more on the Radar</div>}
            </td>
            <td className="px-4 py-3 text-right">
              <button
                onClick={() => onDone(r, r.status !== "done")}
                className={r.status === "done" ? "rounded-control border border-line px-2.5 py-1 text-xs font-medium text-ink hover:bg-subtle" : "rounded-control bg-brand px-2.5 py-1 text-xs font-medium whitespace-nowrap text-white hover:bg-brand-dark"}
              >
                {r.status === "done" ? "Undo" : "Mark done"}
              </button>
            </td>
          </tr>
        ))}
      {open && rest > 0 && (
        <tr className="border-t border-line">
          <td colSpan={6} className="px-4 py-2.5">
            <button onClick={() => setExpanded(!expanded)} className="text-sm font-medium text-brand hover:underline">
              {expanded ? "Show top 5 only" : `Show ${rest} more · ${[...new Set(rows.slice(TOP_N).map((r) => r.account))].slice(0, 4).join(", ")}${rest > 4 ? "…" : ""}`}
            </button>
          </td>
        </tr>
      )}
    </tbody>
  );
}
