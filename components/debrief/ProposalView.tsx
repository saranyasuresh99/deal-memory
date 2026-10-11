"use client";

import Link from "next/link";
import { useState } from "react";
import Badge from "../Badge";
import { showValue } from "./AuditLog";
import { updateStore, useStore, type FieldValue, type Store } from "@/lib/store";
import { applyEdits } from "@/lib/overlay";
import { DEMO_USER, TODAY } from "@/lib/config";
import { formatDate } from "@/lib/format";
import { TYPE_META } from "@/lib/radar-meta";
import type { Account } from "@/lib/types";
import type { DebriefResult } from "@/lib/schemas";

type Target = { kind: "existing"; leadId: string } | { kind: "new" } | null;
// The decision on a row, plus the CRM value it had at that moment (kept so "Before" stays visible).
type RowState = { decision: "approved" | "rejected"; before: FieldValue };

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
}: {
  result: DebriefResult;
  accounts: Account[];
  duplicatePairs: string[][];
}) {
  const store = useStore();
  const m = result.account_match;
  const [target, setTarget] = useState<Target>(() => {
    if (m.is_new_lead) return { kind: "new" };
    if (m.candidates.length === 1 && m.lead_id) return { kind: "existing", leadId: m.lead_id };
    return null; // several candidates: the person must pick
  });
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [editing, setEditing] = useState<{ key: string; text: string; error?: string } | null>(null);
  const [promiseState, setPromiseState] = useState<Record<number, "added" | "ignored">>({});

  const targetKey = target?.kind === "existing" ? target.leadId : target?.kind === "new" ? "new" : "none";
  const baseAccount = target?.kind === "existing" ? accounts.find((a) => a.lead_id === target.leadId) : undefined;
  const current = baseAccount ? applyEdits(baseAccount, store) : undefined;
  const newLead = createdId ? store.newLeads.find((n) => n.lead_id === createdId) : undefined;
  const proposedCompany = result.fields.find((f) => f.field === "company")?.new_value;
  const accountName = current?.company ?? (newLead?.fields.company as string | undefined) ?? (proposedCompany as string | undefined) ?? "(new lead)";
  const fields = target?.kind === "new" ? result.fields : result.fields.filter((f) => f.field !== "company");

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

  function approve(idx: number, field: string, after: FieldValue, quote: string, edited: boolean) {
    const leadId = ensureLeadId();
    const before = currentValue(field);
    updateStore((s): Store => {
      const audit = [...s.audit, { who: DEMO_USER, when: TODAY, lead_id: leadId, account: accountName, field, before, after, quote, edited }];
      if (leadId.startsWith("NEW-")) {
        const newLeads = s.newLeads.map((n) => (n.lead_id === leadId ? { ...n, fields: { ...n.fields, [field]: after } } : n));
        return { ...s, newLeads, audit };
      }
      return { ...s, accountEdits: { ...s.accountEdits, [leadId]: { ...s.accountEdits[leadId], [field]: after } }, audit };
    });
    setRows((r) => ({ ...r, [`${targetKey}:${idx}`]: { decision: "approved", before } }));
    setEditing(null);
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

  return (
    <div className="space-y-5">
      {result.warnings.length > 0 && (
        <div className="space-y-2">
          {result.warnings.map((w) => (
            <div key={w} className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              ⚠ {w}
            </div>
          ))}
        </div>
      )}

      {/* Step 1: which account? */}
      <section className="rounded-xl border border-slate-200 p-4 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">1 · Which account is this about?</h2>
        {m.candidates.length > 1 && (
          <p className="mt-1 text-sm text-slate-600">
            {isDuplicateSet
              ? "These records look like the same client entered twice. Pick one — we never merge records automatically."
              : "More than one account fits. Pick the right one."}
          </p>
        )}
        <div className="mt-3 space-y-2">
          {m.candidates.map((c) => {
            const a = accounts.find((x) => x.lead_id === c.lead_id);
            return (
              <label key={c.lead_id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
                <input
                  type="radio"
                  name="target"
                  checked={target?.kind === "existing" && target.leadId === c.lead_id}
                  onChange={() => setTarget({ kind: "existing", leadId: c.lead_id })}
                  className="mt-1"
                />
                <span className="text-sm">
                  <span className="font-medium">{c.company}</span> <span className="text-slate-400">{c.lead_id}</span>
                  {m.lead_id === c.lead_id && m.candidates.length > 1 && <span className="ml-2"><Badge tone="accent">AI’s best guess</Badge></span>}
                  <span className="block text-slate-600">
                    {a?.contact_name ?? "no contact"} · {a?.status ?? "no status"} · owner {a?.owner ?? "none"}
                  </span>
                  <span className="block text-xs text-slate-500">{c.reason}</span>
                </span>
              </label>
            );
          })}
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-dashed border-slate-300 p-3 hover:bg-slate-50">
            <input type="radio" name="target" checked={target?.kind === "new"} onChange={() => setTarget({ kind: "new" })} className="mt-1" />
            <span className="text-sm">
              <span className="font-medium">Create a new lead</span>
              {m.is_new_lead && <span className="block text-slate-600">No existing CRM account matches this debrief.</span>}
            </span>
          </label>
        </div>
        {target?.kind === "existing" && (
          <Link href={`/accounts/${target.leadId}`} className="mt-2 inline-block text-sm text-accent-600 hover:underline">
            Open account →
          </Link>
        )}
      </section>

      {/* Step 2: field-by-field approval */}
      {target && (
        <section className="rounded-xl border border-slate-200 p-4 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            2 · Proposed CRM changes — {accountName}
          </h2>
          {fields.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">No CRM field changes are proposed.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-xs text-slate-500">
                  <tr>
                    <th className="py-2 pr-3">Field</th>
                    <th className="py-2 pr-3">Before</th>
                    <th className="py-2 pr-3">After (proposed)</th>
                    <th className="py-2 pr-3">Why (quote)</th>
                    <th className="py-2">Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fields.map((f) => {
                    const idx = result.fields.indexOf(f);
                    const key = `${targetKey}:${idx}`;
                    const row = rows[key];
                    const state = row?.decision;
                    const before = row ? row.before : currentValue(f.field);
                    const unchanged = !state && before === f.new_value;
                    const isEditing = editing?.key === key;
                    return (
                      <tr key={key} className="align-top">
                        <td className="py-2 pr-3 font-medium">{FIELD_LABEL[f.field] ?? f.field}</td>
                        <td className="py-2 pr-3 text-slate-500">{showValue(before)}</td>
                        <td className="py-2 pr-3">
                          {isEditing ? (
                            <div>
                              {f.field === "notes" ? (
                                <textarea
                                  value={editing.text}
                                  onChange={(e) => setEditing({ key, text: e.target.value })}
                                  rows={4}
                                  className="w-full rounded-md border border-slate-300 p-1.5"
                                />
                              ) : (
                                <input
                                  value={editing.text}
                                  onChange={(e) => setEditing({ key, text: e.target.value })}
                                  className="w-full rounded-md border border-slate-300 px-1.5 py-1"
                                />
                              )}
                              {editing.error && <span className="text-xs text-red-700">{editing.error}</span>}
                            </div>
                          ) : (
                            showValue(f.new_value)
                          )}
                        </td>
                        <td className="py-2 pr-3 text-slate-600 italic">“{f.quote}”</td>
                        <td className="py-2 whitespace-nowrap">
                          {state === "approved" && <Badge tone="green">Approved</Badge>}
                          {state === "rejected" && <Badge>Rejected</Badge>}
                          {!state && unchanged && <span className="text-xs text-slate-500">Already up to date</span>}
                          {!state && !unchanged && !isEditing && (
                            <div className="flex gap-1">
                              <button onClick={() => approve(idx, f.field, f.new_value, f.quote, false)} className="rounded-md bg-accent-600 px-2 py-1 text-xs font-medium text-white hover:bg-accent-700">
                                Approve
                              </button>
                              <button
                                onClick={() => setEditing({ key, text: f.new_value === null ? "" : String(f.new_value) })}
                                className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                              >
                                Edit
                              </button>
                              <button onClick={() => setRows((r) => ({ ...r, [key]: { decision: "rejected", before: currentValue(f.field) } }))} className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50">
                                Reject
                              </button>
                            </div>
                          )}
                          {isEditing && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => {
                                  const parsed = parseValue(f.field, editing.text);
                                  if ("error" in parsed) setEditing({ ...editing, error: parsed.error });
                                  else approve(idx, f.field, parsed.value, f.quote, parsed.value !== f.new_value);
                                }}
                                className="rounded-md bg-accent-600 px-2 py-1 text-xs font-medium text-white hover:bg-accent-700"
                              >
                                Save &amp; approve
                              </button>
                              <button onClick={() => setEditing(null)} className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50">
                                Cancel
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {createdId && <p className="mt-2 text-xs text-slate-500">New lead created as {createdId} (shown on the Accounts page).</p>}
        </section>
      )}

      {/* Promises */}
      {result.promises.length > 0 && (
        <section className="rounded-xl border border-slate-200 p-4 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Promises made</h2>
          <ul className="mt-3 space-y-3">
            {result.promises.map((p, i) => (
              <li key={i} className="flex flex-wrap items-start justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <div className="font-medium">{p.what}</div>
                  <div className="text-slate-600">
                    Owner: {p.owner ?? <span className="italic text-amber-700">needs input</span>} · Due:{" "}
                    {p.due_date ? formatDate(p.due_date) : <span className="font-medium text-amber-700">{p.date_clear ? "no date given" : "date unclear"}</span>}
                  </div>
                  <div className="text-slate-500 italic">“{p.quote}”</div>
                </div>
                {promiseState[i] === "added" ? (
                  <Badge tone="green">Added to Promise Ledger</Badge>
                ) : promiseState[i] === "ignored" ? (
                  <Badge>Ignored</Badge>
                ) : (
                  <div className="flex gap-1">
                    <button
                      disabled={!target}
                      title={target ? "" : "Pick the account first"}
                      onClick={() => addPromise(i)}
                      className="rounded-md bg-accent-600 px-2 py-1 text-xs font-medium text-white hover:bg-accent-700 disabled:opacity-40"
                    >
                      Add to ledger
                    </button>
                    <button onClick={() => setPromiseState((st) => ({ ...st, [i]: "ignored" }))} className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50">
                      Ignore
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Signals */}
      {result.signals.length > 0 && (
        <section className="rounded-xl border border-slate-200 p-4 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Signals spotted</h2>
          <ul className="mt-3 space-y-2">
            {result.signals.map((s, i) => (
              <li key={i} className="text-sm">
                <Badge tone={TYPE_META[s.type].tone}>{TYPE_META[s.type].label}</Badge>{" "}
                {s.summary}
                {s.due_date && <span className="text-slate-500"> · {formatDate(s.due_date)}</span>}
                <div className="text-slate-500 italic">“{s.quote}”</div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
