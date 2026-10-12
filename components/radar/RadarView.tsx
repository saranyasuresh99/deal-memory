"use client";

import { useEffect, useMemo, useState } from "react";
import { CircleDollarSign, Clock, SquareCheckBig, TrendingUp } from "lucide-react";
import Badge from "../Badge";
import DocPanel from "../DocPanel";
import { Avatar, Card, FilterSelect, GroupHeader, KpiCard, Segmented, th } from "../ui";
import SelectedPanel from "./SelectedPanel";
import { useRegisterExport } from "../shell/ExportContext";
import { TYPE_META } from "@/lib/radar-meta";
import { ownerMatches, useOwnerFilter, useStore, type RadarAction } from "@/lib/store";
import { applyEdits } from "@/lib/overlay";
import { TODAY } from "@/lib/config";
import { GROUPS, OWED_TYPES, accountKey, contextLine, groupOf, radarKpis, valueText, waitingDue } from "@/lib/radar-view";
import type { TimelineEvent } from "@/lib/timeline";
import type { RadarItem } from "@/lib/schemas";
import type { Account, DocumentRecord } from "@/lib/types";

const TOP_N = 5;
type View = "list" | "board" | "owner";
type Section = { key: string; title: string; dot: string; noun: string; collapsed: boolean; items: RadarItem[] };

function isHidden(a: RadarAction | undefined): boolean {
  if (!a) return false;
  if (a.status === "snoozed") return !!a.until && a.until > TODAY;
  return true;
}

export default function RadarView({
  items,
  docs,
  accounts,
  timelines,
}: {
  items: RadarItem[];
  docs: DocumentRecord[];
  accounts: Account[];
  timelines: Record<string, TimelineEvent[]>;
}) {
  const store = useStore();
  const [owner, setOwner] = useOwnerFilter();
  const [type, setType] = useState("all");
  const [view, setView] = useState<View>("list");
  const [showHidden, setShowHidden] = useState(false);
  // The row the person clicked, tied to the view + filters it was clicked in. On load, after a back/forward restore,
  // and whenever the view or filters change, the first row of the first group is selected instead.
  const [picked, setPicked] = useState<{ ctx: string; id: string } | null>(null);
  const [openDoc, setOpenDoc] = useState<{ doc: DocumentRecord; quote?: string } | null>(null);

  const docById = useMemo(() => new Map(docs.map((d) => [d.id, d])), [docs]);
  const accountById = useMemo(() => new Map(accounts.map((a) => [a.lead_id, applyEdits(a, store)])), [accounts, store]);
  const owners = useMemo(() => [...new Set(items.map((i) => i.owner).filter((o): o is string => !!o))].sort(), [items]);
  const types = useMemo(() => [...new Set(items.map((i) => i.type))], [items]);

  const active = items.filter((i) => !isHidden(store.radar[i.id]));
  const hiddenCount = items.length - active.length;
  const kpis = radarKpis(active.filter((i) => ownerMatches(owner, i.owner)), accountById);

  const matching = (showHidden ? items.filter((i) => isHidden(store.radar[i.id])) : active).filter(
    (i) => ownerMatches(owner, i.owner) && (type === "all" || i.type === type),
  );

  const sections: Section[] = useMemo(() => {
    if (view === "owner") {
      const keys = [...owners, null];
      return keys
        .map((o) => ({
          key: o ?? "none",
          title: o ?? "No owner",
          dot: o ? "bg-brand" : "bg-dq-fg",
          noun: "items",
          collapsed: false,
          items: matching.filter((i) => i.owner === o),
        }))
        .filter((s) => s.items.length > 0)
        .sort((a, b) => b.items.length - a.items.length);
    }
    return GROUPS.map((g) => ({ ...g, items: matching.filter((i) => groupOf(i) === g.key) })).filter((s) => s.items.length > 0);
  }, [view, matching, owners]);

  // Default selection: the first row of the first group (also used if the picked item disappears, e.g. marked done).
  const ctx = `${view}|${owner}|${type}|${showHidden}`;
  const firstId = sections[0]?.items[0]?.id ?? null;
  const pickedId = picked?.ctx === ctx ? picked.id : null;
  const selected = matching.find((i) => i.id === pickedId) ?? matching.find((i) => i.id === firstId) ?? null;
  const setSelectedId = (id: string) => setPicked({ ctx, id });

  // Pages restored from the browser's back/forward cache keep old React state — start again from the first row.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => e.persisted && setPicked(null);
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  useRegisterExport(`radar-${TODAY}.csv`, () =>
    matching.map((i) => ({
      group: view === "owner" ? i.owner ?? "No owner" : GROUPS.find((g) => g.key === groupOf(i))?.title,
      type: TYPE_META[i.type].label,
      account: i.account,
      lead_ids: i.lead_ids.join(" "),
      owner: i.owner ?? "",
      waiting_or_due: `${waitingDue(i).main} ${waitingDue(i).sub}`.trim(),
      value_usd: i.value_usd ?? "",
      summary: i.summary,
      next_action: i.suggested_next_action,
      source_file: i.evidence[0]?.file,
      source_quote: i.evidence[0]?.quote,
    })),
  );

  const selAccount = selected && selected.lead_ids.length === 1 ? accountById.get(selected.lead_ids[0]) ?? null : null;
  const owes = selected
    ? active.filter((i) => accountKey(i) === accountKey(selected) && OWED_TYPES.includes(i.type))
    : [];

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={CircleDollarSign}
          label="At stake"
          value={kpis.atStake.text}
          sub={`${kpis.atStake.deals.length} deal${kpis.atStake.deals.length === 1 ? "" : "s"} waiting on an overdue action`}
        />
        <KpiCard
          icon={Clock}
          label="Clients waiting on us"
          value={kpis.waiting.count}
          sub={kpis.waiting.oldest ? `Oldest: ${kpis.waiting.oldest.days_waiting} days (${kpis.waiting.oldest.account})` : "Nobody is waiting"}
        />
        <KpiCard
          icon={SquareCheckBig}
          label="Overdue promises"
          value={kpis.overdue.count}
          sub={
            kpis.overdue.dueToday.length
              ? `+${kpis.overdue.dueToday.length} due today (${kpis.overdue.dueToday.map((i) => i.account).join(", ")})`
              : "None due today"
          }
        />
        <KpiCard icon={TrendingUp} label="Hidden revenue" value={kpis.hidden.count} sub="Cross-sells, referrals, returning deals" />
      </div>

      <div className="grid grid-cols-1 gap-6 wide:grid-cols-[minmax(0,1fr)_340px]">
        {/* Leak list */}
        <Card className="min-w-0 overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
            <h2 className="text-base font-semibold text-navy">Leak list</h2>
            <Segmented<View>
              value={view}
              onChange={setView}
              options={[
                { value: "list", label: "List" },
                { value: "board", label: "Board" },
                { value: "owner", label: "By owner" },
              ]}
            />
            <div className="ml-auto flex flex-wrap gap-2">
              <FilterSelect
                label="Owner"
                value={owner}
                onChange={setOwner}
                options={[{ value: "all", label: "All" }, ...owners.map((o) => ({ value: o, label: o })), { value: "none", label: "No owner" }]}
              />
              <FilterSelect
                label="Type"
                value={type}
                onChange={setType}
                options={[{ value: "all", label: "All" }, ...types.map((t) => ({ value: t, label: TYPE_META[t].label }))]}
              />
            </div>
          </div>

          {(hiddenCount > 0 || showHidden) && (
            <div className="border-b border-line bg-subtle px-4 py-2 text-sm">
              <button onClick={() => setShowHidden(!showHidden)} className="font-medium text-brand hover:underline">
                {showHidden ? "← Back to active items" : `Show done / snoozed / dismissed (${hiddenCount})`}
              </button>
            </div>
          )}

          {sections.length === 0 && <p className="px-4 py-10 text-center text-sm text-muted">Nothing here.</p>}

          {view === "board" ? (
            <BoardView sections={sections} selectedId={selected?.id ?? null} onSelect={setSelectedId} />
          ) : (
            sections.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-sm">
                  <thead className="border-b border-line bg-subtle">
                    <tr>
                      <th className={th}>Account</th>
                      <th className={th}>Leak</th>
                      <th className={th}>Owner</th>
                      <th className={th}>Waiting / due</th>
                      <th className={`${th} text-right`}>Value</th>
                    </tr>
                  </thead>
                  {sections.map((s) => (
                    <GroupRows
                      key={`${view}-${s.key}`}
                      section={s}
                      selectedId={selected?.id ?? null}
                      onSelect={setSelectedId}
                      accounts={accountById}
                    />
                  ))}
                </table>
              </div>
            )
          )}
        </Card>

        {/* Selected panel */}
        <aside className="min-w-0">
          <Card className="p-5 wide:sticky wide:top-[78px]">
            {selected ? (
              <SelectedPanel
                key={selected.id}
                item={selected}
                account={selAccount}
                action={store.radar[selected.id]}
                timeline={(timelines[accountKey(selected)] ?? []).slice(0, 4)}
                owes={owes}
                docById={docById}
                onOpenDoc={(doc, quote) => setOpenDoc({ doc, quote })}
              />
            ) : (
              <p className="text-sm text-muted">Select a row to see its evidence and history.</p>
            )}
          </Card>
        </aside>
      </div>

      <DocPanel doc={openDoc?.doc ?? null} highlight={openDoc?.quote} onClose={() => setOpenDoc(null)} />
    </div>
  );
}

function GroupRows({
  section,
  selectedId,
  onSelect,
  accounts,
}: {
  section: Section;
  selectedId: string | null;
  onSelect: (id: string) => void;
  accounts: Map<string, Account>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [open, setOpen] = useState(!section.collapsed);
  const shown = expanded ? section.items : section.items.slice(0, TOP_N);
  const rest = section.items.slice(TOP_N);

  return (
    <tbody className="border-b border-line last:border-b-0">
      <tr>
        <td colSpan={5} className="p-0">
          {section.collapsed ? (
            <button onClick={() => setOpen(!open)} aria-expanded={open} className="w-full text-left hover:bg-subtle">
              <GroupHeader dot={section.dot} title={section.title} count={`${section.items.length} ${section.noun} · ${open ? "hide" : "show"}`} />
            </button>
          ) : (
            <GroupHeader dot={section.dot} title={section.title} count={`${section.items.length} ${section.noun}`} />
          )}
        </td>
      </tr>
      {open &&
        shown.map((i) => {
          const sel = i.id === selectedId;
          const wd = waitingDue(i);
          const value = valueText(i);
          return (
            <tr
              key={i.id}
              tabIndex={0}
              aria-selected={sel}
              onClick={() => onSelect(i.id)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onSelect(i.id))}
              className={`cursor-pointer border-t border-line ${sel ? "bg-tint/60 shadow-[inset_3px_0_0_var(--color-brand)]" : "hover:bg-subtle"}`}
            >
              <td className="px-4 py-3">
                <div className="font-medium text-ink">{i.account}</div>
                <div className="text-xs text-muted">{contextLine(i, accounts)}</div>
              </td>
              <td className="px-4 py-3">
                <Badge tone={TYPE_META[i.type].tone}>{TYPE_META[i.type].label}</Badge>
              </td>
              <td className="px-4 py-3">
                <Avatar name={i.owner} />
              </td>
              <td className="px-4 py-3">
                <div className="text-ink">{wd.main}</div>
                {wd.sub && <div className="text-xs text-muted">{wd.sub}</div>}
              </td>
              <td className="px-4 py-3 text-right">
                {value ? (
                  <span className="font-semibold text-navy" title={i.value_source === "quote" ? "Value stated in a quote (lower bound of a range)" : "Value from the CRM"}>
                    {value}
                  </span>
                ) : (
                  <span className="text-muted">value unknown</span>
                )}
              </td>
            </tr>
          );
        })}
      {open && rest.length > 0 && (
        <tr className="border-t border-line">
          <td colSpan={5} className="px-4 py-2.5">
            <button onClick={() => setExpanded(!expanded)} className="text-left text-sm font-medium text-brand hover:underline">
              {expanded
                ? "Show top 5 only"
                : `Show ${rest.length} more · ${[...new Set(rest.map((i) => i.account))].slice(0, 4).join(", ")}${new Set(rest.map((i) => i.account)).size > 4 ? "…" : ""}`}
            </button>
          </td>
        </tr>
      )}
    </tbody>
  );
}

function BoardView({ sections, selectedId, onSelect }: { sections: Section[]; selectedId: string | null; onSelect: (id: string) => void }) {
  return (
    <div className="flex gap-3 overflow-x-auto p-4">
      {sections.map((s) => (
        <BoardColumn key={s.key} section={s} selectedId={selectedId} onSelect={onSelect} />
      ))}
    </div>
  );
}

function BoardColumn({ section, selectedId, onSelect }: { section: Section; selectedId: string | null; onSelect: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? section.items : section.items.slice(0, TOP_N);
  return (
    <div className="w-[240px] shrink-0 rounded-card bg-subtle p-2">
      <div className="flex items-center gap-2 px-1 pt-1 pb-2">
        <span className={`h-2 w-2 rounded-full ${section.dot}`} />
        <span className="text-sm font-semibold text-navy">{section.title}</span>
        <span className="text-xs text-muted">{section.items.length}</span>
      </div>
      <div className="space-y-2">
        {shown.map((i) => {
          const value = valueText(i);
          return (
            <button
              key={i.id}
              onClick={() => onSelect(i.id)}
              aria-pressed={i.id === selectedId}
              className={`block w-full rounded-control border bg-surface p-2.5 text-left shadow-card ${i.id === selectedId ? "border-brand ring-1 ring-brand" : "border-line hover:border-tint-2"}`}
            >
              <div className="truncate text-sm font-medium text-ink">{i.account}</div>
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <Badge tone={TYPE_META[i.type].tone}>{TYPE_META[i.type].label}</Badge>
                <Avatar name={i.owner} size={24} />
              </div>
              <div className="mt-1.5 text-xs">{value ? <span className="font-semibold text-navy">{value}</span> : <span className="text-muted">value unknown</span>}</div>
            </button>
          );
        })}
      </div>
      {section.items.length > TOP_N && (
        <button onClick={() => setExpanded(!expanded)} className="mt-2 w-full rounded-control py-1.5 text-xs font-medium text-brand hover:bg-surface">
          {expanded ? "Show top 5 only" : `Show ${section.items.length - TOP_N} more`}
        </button>
      )}
    </div>
  );
}

