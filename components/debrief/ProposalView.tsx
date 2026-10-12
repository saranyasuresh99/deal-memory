"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, TriangleAlert } from "lucide-react";
import Badge from "../Badge";
import { Avatar, btn } from "../ui";
import { showValue } from "./AuditLog";
import { updateStore, useStore, type FieldValue, type Store } from "@/lib/store";
import { applyEdits } from "@/lib/overlay";
import { DEMO_USER, TODAY } from "@/lib/config";
import { formatDate } from "@/lib/format";
import { TYPE_META } from "@/lib/radar-meta";
import type { Account } from "@/lib/types";
import type { DebriefResult } from "@/lib/schemas";

type Target = { kind: "existing"; leadId: string } | { kind: "new" } | null;
export type Phase = "review" | "approve";

// What the person decided for each proposed field (kept so the Approve step can show before → after).
type Decision = { field: string; decision: "approved" | "rejected"; before: FieldValue; after: FieldValue; edited: boolean; quote: string };

const FIELD_LABEL: Record<string, string> = {
  company: "Company",
  contact_name: "Contact",
  contact_email: "Email",
  source: "Source",
  service_interest: "Service interest",
  status: "Status",
  est_value_usd: "Est. value (USD)",
  owner: "Owner",
  last_contact_date: "Last contact",
  next_followup_date: "Next follow-up",
  notes: "Notes",
};

// Turn what the person typed into a CRM value, or explain why it's not valid.
function parseValue(field: string, raw: string): { value: FieldValue } | { error: string } {
  const s = raw.trim();
  if (s === "") return { value: null };
  if (field === "est_value_usd") {
    const n = Number(s.replace(/[$,\s]/g, ""));
    return Number.isFinite(n) && n >= 0 ? { value: n } : { error: "Enter a number, e.g. 35000" };
  }
  if (field.endsWith("_date")) {
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? { value: s } : { error: "Use the format YYYY-MM-DD" };
  }
  return { value: s };
}

export default function ProposalView({
  result,
  accounts,
  duplicatePairs,
  phase,
  setPhase,
  onBack,
  onNew,
}: {
  result: DebriefResult;
  accounts: Account[];
  duplicatePairs: string[][];
  phase: Phase;
  setPhase: (p: Phase) => void;
  onBack: () => void;
  onNew: () => void;
}) {
  const store = useStore();
  const m = result.account_match;
  const [target, setTarget] = useState<Target>(() => {
    if (m.is_new_lead) return { kind: "new" };
    if (m.candidates.length === 1 && m.lead_id) return { kind: "existing", leadId: m.lead_id };
    return null; // several candidates: the person must pick
  });
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [checked, setChecked] = useState<Record<number, boolean>>({}); // nothing is pre-approved
  const [edits, setEdits] = useState<Record<number, FieldValue>>({}); // values the person changed
  const [editing, setEditing] = useState<{ idx: number; text: string; error?: string } | null>(null);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [promiseState, setPromiseState] = useState<Record<number, "added" | "ignored">>({});

  const baseAccount = target?.kind === "existing" ? accounts.find((a) => a.lead_id === target.leadId) : undefined;
  const current = baseAccount ? applyEdits(baseAccount, store) : undefined;
  const newLead = createdId ? store.newLeads.find((n) => n.lead_id === createdId) : undefined;
  const proposedCompany = result.fields.find((f) => f.field === "company")?.new_value;
  const accountName = current?.company ?? (newLead?.fields.company as string | undefined) ?? (proposedCompany as string | undefined) ?? "(new lead)";
  const fields = (target?.kind === "new" ? result.fields : result.fields.filter((f) => f.field !== "company")).map((f) => ({
    ...f,
    idx: result.fields.indexOf(f),
  }));

  const candidateIds = m.candidates.map((c) => c.lead_id);
  const isDuplicateSet = duplicatePairs.some((p) => p.every((id) => candidateIds.includes(id)));

  function currentValue(field: string): FieldValue {
    if (current) return (current[field as keyof Account] as FieldValue) ?? null;
    return newLead?.fields[field] ?? null;
  }

  // Creates the new lead on first use and returns its id.
  function ensureLeadId(): string {
    if (target?.kind === "existing") return target.leadId;
    if (createdId) return createdId;
    const id = `NEW-${store.newLeads.length + 1}`;
    updateStore((s) => ({ ...s, newLeads: [...s.newLeads, { lead_id: id, fields: { status: "New", created_date: TODAY } }] }));
    setCreatedId(id);
    return id;
  }

  // Writes one approved field to the browser overlay and the audit log (the only place CRM values change).
  function writeField(leadId: string, field: string, before: FieldValue, after: FieldValue, quote: string, edited: boolean) {
    updateStore((s): Store => {
      const audit = [...s.audit, { who: DEMO_USER, when: TODAY, lead_id: leadId, account: accountName, field, before, after, quote, edited }];
      if (leadId.startsWith("NEW-")) {
        const newLeads = s.newLeads.map((n) => (n.lead_id === leadId ? { ...n, fields: { ...n.fields, [field]: after } } : n));
        return { ...s, newLeads, audit };
      }
      return { ...s, accountEdits: { ...s.accountEdits, [leadId]: { ...s.accountEdits[leadId], [field]: after } }, audit };
    });
  }

  const actionable = fields.filter((f) => currentValue(f.field) !== (edits[f.idx] ?? f.new_value));
  const selectedCount = actionable.filter((f) => checked[f.idx]).length;

  function approveSelected() {
    if (!target) return;
    const chosen = actionable.filter((f) => checked[f.idx]);
    const leadId = chosen.length ? ensureLeadId() : target.kind === "existing" ? target.leadId : createdId;
    const out: Decision[] = actionable.map((f) => {
      const after = f.idx in edits ? edits[f.idx] : f.new_value;
      const before = currentValue(f.field);
      const edited = f.idx in edits && edits[f.idx] !== f.new_value;
      if (checked[f.idx] && leadId) {
        writeField(leadId, f.field, before, after, f.quote, edited);
        return { field: f.field, decision: "approved", before, after, edited, quote: f.quote };
      }
      return { field: f.field, decision: "rejected", before, after, edited, quote: f.quote };
    });
    setDecisions(out);
    setEditing(null);
    setPhase("approve");
  }

  function addPromise(idx: number) {
    const p = result.promises[idx];
    const leadId = target ? ensureLeadId() : null;
    updateStore((s) => ({
      ...s,
      promises: [
        ...s.promises,
        {
          id: `debrief-${s.promises.length + 1}`,
          lead_id: leadId,
          account: accountName,
          owner: p.owner,
          what: p.what,
          due_date: p.due_date,
          date_clear: p.date_clear,
          quote: p.quote,
          source: "debrief",
          status: "open",
          approved_on: TODAY,
        },
      ],
    }));
    setPromiseState((st) => ({ ...st, [idx]: "added" }));
  }

  // ---------- Approve step ----------
  if (phase === "approve") {
    const approved = decisions.filter((d) => d.decision === "approved");
    const rejected = decisions.filter((d) => d.decision === "rejected");
    const leadForLink = target?.kind === "existing" ? target.leadId : null;
    return (
      <div className="space-y-6">
        <div className="flex items-start gap-3 rounded-card bg-tint p-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-white">
            <Check size={18} />
          </span>
          <div className="text-sm">
            <div className="font-semibold text-navy">
              {approved.length} change{approved.length === 1 ? "" : "s"} approved for {accountName}
              {rejected.length > 0 && `, ${rejected.length} rejected`}
            </div>
            <div className="text-brand-dark">
              {approved.length > 0 ? "Saved in this browser and recorded in the audit log." : "Nothing in the CRM was changed."}
              {createdId && ` New lead created as ${createdId} (see Accounts).`}
            </div>
          </div>
        </div>

        {decisions.length > 0 && (
          <ul className="divide-y divide-line rounded-card border border-line">
            {decisions.map((d) => (
              <li key={d.field} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-sm">
                <span className="w-32 shrink-0 font-medium text-ink">{FIELD_LABEL[d.field] ?? d.field}</span>
                <span className="min-w-0 flex-1 truncate text-muted">
                  {showValue(d.before)} → <span className="text-ink">{showValue(d.after)}</span>
                </span>
                {d.decision === "approved" ? (
                  <Badge tone="rev">{d.edited ? "Approved (edited)" : "Approved"}</Badge>
                ) : (
                  <Badge>Rejected</Badge>
                )}
              </li>
            ))}
          </ul>
        )}

        {result.promises.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-semibold text-navy">Promises made — add to the Promise Ledger?</h3>
            <ul className="space-y-2">
              {result.promises.map((p, i) => (
                <li key={i} className="flex flex-wrap items-start justify-between gap-3 rounded-card border border-line p-3 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium text-ink">{p.what}</div>
                    <div className="text-muted">
                      Owner: {p.owner ?? <span className="text-warn-fg">needs input</span>} · Due:{" "}
                      {p.due_date ? formatDate(p.due_date) : <span className="font-medium text-warn-fg">{p.date_clear ? "no date given" : "date unclear"}</span>}
                    </div>
                    <div className="mt-1 text-xs text-muted">“{p.quote}”</div>
                  </div>
                  {promiseState[i] === "added" ? (
                    <Badge tone="rev">Added to ledger</Badge>
                  ) : promiseState[i] === "ignored" ? (
                    <Badge>Ignored</Badge>
                  ) : (
                    <div className="flex gap-1.5">
                      <button onClick={() => addPromise(i)} className={btn.smallPrimary}>
                        Add to ledger
                      </button>
                      <button onClick={() => setPromiseState((st) => ({ ...st, [i]: "ignored" }))} className={btn.small}>
                        Ignore
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="flex flex-wrap gap-2 border-t border-line pt-4">
          <Link href="/audit" className={btn.secondary}>
            View audit log
          </Link>
          {leadForLink && (
            <Link href={`/accounts/${leadForLink}`} className={btn.secondary}>
              Open account
            </Link>
          )}
          {result.promises.length > 0 && (
            <Link href="/promises" className={btn.secondary}>
              Promise Ledger
            </Link>
          )}
          <button onClick={onNew} className={`${btn.primary} ml-auto`}>
            New debrief
          </button>
        </div>
      </div>
    );
  }

  // ---------- Review step ----------
  return (
    <div className="space-y-6">
      {result.warnings.length > 0 && (
        <div className="space-y-2">
          {result.warnings.map((w) => (
            <div key={w} className="flex gap-2 rounded-control border border-[#f2cf7a] bg-warn-bg px-3 py-2 text-sm text-warn-fg">
              <TriangleAlert size={16} className="mt-0.5 shrink-0" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      <section>
        <h3 className="text-sm font-semibold text-navy">Which account is this about?</h3>
        {m.candidates.length > 1 && (
          <p className="mt-0.5 text-sm text-muted">
            {isDuplicateSet
              ? "These records look like the same client entered twice. Pick one — we never merge records automatically."
              : "More than one account fits. Pick the right one."}
          </p>
        )}
        <div className="mt-2 space-y-2">
          {m.candidates.map((c) => {
            const a = accounts.find((x) => x.lead_id === c.lead_id);
            const on = target?.kind === "existing" && target.leadId === c.lead_id;
            return (
              <label
                key={c.lead_id}
                className={`flex cursor-pointer items-start gap-3 rounded-card border p-3 ${on ? "border-brand bg-tint/50" : "border-line hover:bg-subtle"}`}
              >
                <input type="radio" name="target" checked={on} onChange={() => setTarget({ kind: "existing", leadId: c.lead_id })} className="mt-1 accent-[var(--color-brand)]" />
                <Avatar name={a?.owner ?? null} size={32} />
                <span className="min-w-0 flex-1 text-sm">
                  <span className="font-medium text-ink">{c.company}</span> <span className="text-muted">{c.lead_id}</span>
                  {m.lead_id === c.lead_id && m.candidates.length > 1 && (
                    <span className="ml-2">
                      <Badge tone="brand">AI&apos;s best guess</Badge>
                    </span>
                  )}
                  <span className="block text-muted">
                    {a?.contact_name ?? "no contact"} · {a?.status ?? "no status"} · owner {a?.owner ?? "none"}
                  </span>
                  <span className="block text-xs text-muted">{c.reason}</span>
                </span>
              </label>
            );
          })}
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-card border border-dashed p-3 ${target?.kind === "new" ? "border-brand bg-tint/50" : "border-line hover:bg-subtle"}`}
          >
            <input type="radio" name="target" checked={target?.kind === "new"} onChange={() => setTarget({ kind: "new" })} className="mt-1 accent-[var(--color-brand)]" />
            <span className="text-sm">
              <span className="font-medium text-ink">Create a new lead</span>
              {m.is_new_lead && <span className="block text-muted">No existing CRM account matches this debrief.</span>}
            </span>
          </label>
        </div>
      </section>

      {target && (
        <section>
          <h3 className="text-sm font-semibold text-navy">Proposed CRM changes — {accountName}</h3>
          <p className="mt-0.5 text-sm text-muted">Tick each change you approve. Unticked changes are rejected. Nothing changes until you press Approve.</p>
          {fields.length === 0 ? (
            <p className="mt-2 rounded-control bg-subtle px-3 py-2 text-sm text-muted">No CRM field changes are proposed.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {fields.map((f) => {
                const before = currentValue(f.field);
                const after = f.idx in edits ? edits[f.idx] : f.new_value;
                const upToDate = before === after;
                const isEditing = editing?.idx === f.idx;
                const on = !!checked[f.idx] && !upToDate;
                return (
                  <li key={f.idx} className={`rounded-card border p-3 ${on ? "border-brand bg-tint/40" : "border-line"}`}>
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        aria-label={`Approve ${FIELD_LABEL[f.field] ?? f.field}`}
                        checked={on}
                        disabled={upToDate || isEditing}
                        onChange={(e) => setChecked((c) => ({ ...c, [f.idx]: e.target.checked }))}
                        className="mt-1 h-4 w-4 accent-[var(--color-brand)]"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-ink">{FIELD_LABEL[f.field] ?? f.field}</span>
                          {upToDate ? (
                            <span className="text-xs text-muted">Already up to date</span>
                          ) : (
                            !isEditing && (
                              <button onClick={() => setEditing({ idx: f.idx, text: after === null ? "" : String(after) })} className={btn.small}>
                                Edit
                              </button>
                            )
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-start gap-2 text-sm">
                          <span className="text-muted line-through decoration-line">{showValue(before)}</span>
                          <ArrowRight size={14} className="mt-1 shrink-0 text-muted" />
                          {isEditing ? (
                            <div className="min-w-0 flex-1">
                              {f.field === "notes" ? (
                                <textarea
                                  value={editing.text}
                                  onChange={(e) => setEditing({ idx: f.idx, text: e.target.value })}
                                  rows={4}
                                  className="w-full rounded-control border border-line p-2"
                                />
                              ) : (
                                <input
                                  value={editing.text}
                                  onChange={(e) => setEditing({ idx: f.idx, text: e.target.value })}
                                  className="w-full rounded-control border border-line px-2 py-1"
                                />
                              )}
                              {editing.error && <div className="text-xs text-danger-fg">{editing.error}</div>}
                              <div className="mt-1.5 flex gap-1.5">
                                <button
                                  onClick={() => {
                                    const parsed = parseValue(f.field, editing.text);
                                    if ("error" in parsed) return setEditing({ ...editing, error: parsed.error });
                                    setEdits((e) => ({ ...e, [f.idx]: parsed.value }));
                                    setChecked((c) => ({ ...c, [f.idx]: true }));
                                    setEditing(null);
                                  }}
                                  className={btn.smallPrimary}
                                >
                                  Save
                                </button>
                                <button onClick={() => setEditing(null)} className={btn.small}>
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <span className="min-w-0 flex-1 font-medium text-navy">
                              {showValue(after)}
                              {f.idx in edits && edits[f.idx] !== f.new_value && <span className="ml-1 text-xs font-normal text-warn-fg">(edited)</span>}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 rounded-control bg-subtle px-2.5 py-1.5 text-xs text-ink">“{f.quote}”</div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {result.signals.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-navy">Signals spotted</h3>
          <ul className="space-y-2">
            {result.signals.map((s, i) => (
              <li key={i} className="text-sm">
                <Badge tone={TYPE_META[s.type].tone}>{TYPE_META[s.type].label}</Badge> <span className="text-ink">{s.summary}</span>
                {s.due_date && <span className="text-muted"> · {formatDate(s.due_date)}</span>}
                <div className="mt-1 text-xs text-muted">“{s.quote}”</div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {result.promises.length > 0 && (
        <p className="text-sm text-muted">
          {result.promises.length} promise{result.promises.length === 1 ? "" : "s"} found — you can add {result.promises.length === 1 ? "it" : "them"} to the
          Promise Ledger in the next step.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
        <button onClick={onBack} className={btn.secondary}>
          Back
        </button>
        <button onClick={approveSelected} disabled={!target || !!editing} className={`${btn.primary} ml-auto`}>
          {selectedCount > 0 ? `Approve ${selectedCount} change${selectedCount === 1 ? "" : "s"}` : "Continue without changes"}
        </button>
      </div>
      {!target && <p className="text-right text-xs text-muted">Pick the account first.</p>}
    </div>
  );
}
