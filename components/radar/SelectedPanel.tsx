"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, Ellipsis } from "lucide-react";
import Badge from "../Badge";
import { MiniStat, btn } from "../ui";
import { TYPE_META } from "@/lib/radar-meta";
import { updateStore, type RadarAction } from "@/lib/store";
import { TODAY } from "@/lib/config";
import { formatDate, formatShort, formatUsdShort } from "@/lib/format";
import { owedDays, waitingDue } from "@/lib/radar-view";
import { quoteDate, type TimelineEvent } from "@/lib/timeline";
import type { RadarItem } from "@/lib/schemas";
import type { Account, DocumentRecord } from "@/lib/types";

function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function setRadarAction(id: string, a: RadarAction | null) {
  updateStore((s) => {
    const radar = { ...s.radar };
    if (a) radar[id] = a;
    else delete radar[id];
    return { ...s, radar };
  });
}

export default function SelectedPanel({
  item,
  account,
  action,
  timeline,
  owes,
  docById,
  onOpenDoc,
}: {
  item: RadarItem;
  account: Account | null;
  action: RadarAction | undefined;
  timeline: TimelineEvent[];
  owes: RadarItem[];
  docById: Map<string, DocumentRecord>;
  onOpenDoc: (doc: DocumentRecord, quote?: string) => void;
}) {
  const [menu, setMenu] = useState<"closed" | "open" | "snooze" | "dismiss">("closed");
  const [until, setUntil] = useState(addDays(TODAY, 7));
  const [reason, setReason] = useState("");
  const [allEvidence, setAllEvidence] = useState(false);
  const meta = TYPE_META[item.type];
  const wd = waitingDue(item);
  const statLabel = item.type === "waiting_on_us" || item.type === "returning_lost" ? "Waiting" : item.type === "stale_deal" ? "No contact" : "Due";
  const evidence = allEvidence ? item.evidence : item.evidence.slice(0, 1);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-muted">Selected</div>
          <h2 className="mt-0.5 text-xl font-semibold text-navy">{item.account}</h2>
          <div className="mt-0.5 text-sm text-muted">
            {[item.lead_ids.join(" + ") || "not in CRM", account?.status ?? (item.lead_ids.length ? "no status" : null), item.owner ?? "No owner"]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>
        <Badge tone={meta.tone}>{meta.label}</Badge>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <MiniStat value={item.value_usd !== null ? formatUsdShort(item.value_usd) : "Unknown"} label="Deal value" />
        <MiniStat value={wd.main} label={statLabel} />
        <MiniStat value={account?.last_contact_date ? formatShort(account.last_contact_date) : item.lead_ids.length ? "Never" : "—"} label="Last CRM update" />
      </div>

      <p className="text-sm text-ink">{item.summary}</p>

      <div className="space-y-2">
        {evidence.map((e) => {
          const doc = docById.get(e.file);
          return (
            <figure key={e.file + e.quote} className="rounded-card bg-subtle p-3.5">
              <blockquote className="line-clamp-4 text-sm leading-relaxed text-ink">“{e.quote}”</blockquote>
              <figcaption className="mt-2 text-sm">
                {doc ? (
                  <button onClick={() => onOpenDoc(doc, e.quote)} className={`${btn.link} inline-flex items-center gap-0.5`}>
                    {doc.type === "email" ? "Email" : "Meeting note"} · {formatShort(quoteDate(doc, e.quote))}
                    <ChevronRight size={14} />
                  </button>
                ) : e.file === "crm_export.csv" && item.lead_ids.length === 1 ? (
                  <Link href={`/accounts/${item.lead_ids[0]}`} className={`${btn.link} inline-flex items-center gap-0.5`}>
                    CRM record <ChevronRight size={14} />
                  </Link>
                ) : (
                  <span className="text-muted">{e.file === "crm_export.csv" ? "CRM record" : e.file}</span>
                )}
              </figcaption>
            </figure>
          );
        })}
        {item.evidence.length > 1 && (
          <button onClick={() => setAllEvidence(!allEvidence)} className="text-xs text-muted hover:text-ink hover:underline">
            {allEvidence ? "Show less" : `+${item.evidence.length - 1} more source${item.evidence.length > 2 ? "s" : ""}`}
          </button>
        )}
      </div>

      <div className="rounded-control border border-line px-3 py-2 text-sm">
        <span className="font-medium text-navy">Next: </span>
        {item.suggested_next_action}
      </div>

      {timeline.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-navy">Memory timeline</h3>
          <ol className="relative space-y-3 pl-5 before:absolute before:top-1.5 before:bottom-1.5 before:left-[5px] before:w-px before:bg-tint-2">
            {timeline.map((t, i) => {
              const doc = t.docId ? docById.get(t.docId) : undefined;
              return (
                <li key={i} className="relative">
                  <span className={`absolute top-1.5 -left-5 h-[11px] w-[11px] rounded-full border-2 border-brand ${i === 0 ? "bg-brand" : "bg-surface"}`} />
                  {doc ? (
                    <button onClick={() => onOpenDoc(doc)} className="text-left text-sm text-ink hover:text-brand">
                      {t.title}
                    </button>
                  ) : (
                    <div className="text-sm text-ink">{t.title}</div>
                  )}
                  <div className="text-xs text-muted">
                    {formatShort(t.date)} · {t.kind}
                    {t.detail ? ` · ${t.detail}` : ""}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {owes.length > 0 && (
        <section>
          <h3 className="mb-1 text-sm font-semibold text-navy">What AtliQ owes</h3>
          <ul className="divide-y divide-line border-t border-line">
            {owes.map((o) => (
              <li key={o.id} className="flex items-start justify-between gap-3 py-2 text-sm">
                <span className="text-ink">{o.suggested_next_action}</span>
                <span className="shrink-0 text-muted">{owedDays(o)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {action ? (
        <div className="flex flex-wrap items-center gap-2 rounded-control bg-subtle px-3 py-2 text-sm">
          <span className="flex-1 text-muted">
            {action.status === "done" && "Marked done"}
            {action.status === "snoozed" && `Snoozed until ${formatDate(action.until ?? null)}`}
            {action.status === "dismissed" && `Dismissed: ${action.reason}`}
          </span>
          <button onClick={() => setRadarAction(item.id, null)} className={btn.small}>
            Restore
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-2">
            {item.lead_ids.length === 1 ? (
              <Link href={`/accounts/${item.lead_ids[0]}`} className={`${btn.secondary} flex-1`}>
                Open account
              </Link>
            ) : (
              <span className={`${btn.secondary} flex-1 cursor-not-allowed opacity-40`} title="This company is not a single CRM account">
                Open account
              </span>
            )}
            <button onClick={() => setRadarAction(item.id, { status: "done", at: TODAY })} className={`${btn.primary} flex-1`}>
              Mark done
            </button>
            <div className="relative">
              <button
                onClick={() => setMenu(menu === "closed" ? "open" : "closed")}
                aria-label="More actions"
                aria-expanded={menu !== "closed"}
                className={`${btn.secondary} h-full px-2.5`}
              >
                <Ellipsis size={18} />
              </button>
              {menu === "open" && (
                <div className="absolute right-0 bottom-full z-20 mb-1 w-36 rounded-control border border-line bg-surface p-1 shadow-card">
                  <button onClick={() => setMenu("snooze")} className="block w-full rounded-[6px] px-2 py-1.5 text-left text-sm hover:bg-subtle">
                    Snooze…
                  </button>
                  <button onClick={() => setMenu("dismiss")} className="block w-full rounded-[6px] px-2 py-1.5 text-left text-sm hover:bg-subtle">
                    Dismiss…
                  </button>
                </div>
              )}
            </div>
          </div>
          {menu === "snooze" && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <label className="text-muted" htmlFor="snooze-date">
                Snooze until
              </label>
              <input
                id="snooze-date"
                type="date"
                min={addDays(TODAY, 1)}
                value={until}
                onChange={(e) => setUntil(e.target.value)}
                className="rounded-control border border-line px-2 py-1"
              />
              <button disabled={!until || until <= TODAY} onClick={() => setRadarAction(item.id, { status: "snoozed", until, at: TODAY })} className={btn.smallPrimary}>
                Snooze
              </button>
              <button onClick={() => setMenu("closed")} className="text-muted hover:underline">
                Cancel
              </button>
            </div>
          )}
          {menu === "dismiss" && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <input
                autoFocus
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why dismiss? (required)"
                aria-label="Reason for dismissing"
                className="min-w-0 flex-1 rounded-control border border-line px-2 py-1"
              />
              <button
                disabled={reason.trim().length === 0}
                onClick={() => setRadarAction(item.id, { status: "dismissed", reason: reason.trim(), at: TODAY })}
                className={btn.smallPrimary}
              >
                Dismiss
              </button>
              <button onClick={() => setMenu("closed")} className="text-muted hover:underline">
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
