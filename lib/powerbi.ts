// Tables for Power BI (and any BI tool). One builder, two callers:
// - the browser "Export for Power BI" (base data + approvals saved in this browser), and
// - the read-only GET routes /api/export/*.csv (base data + Radar only).
// Conventions: lead_id is the join key in every table; dates are YYYY-MM-DD; numbers have no $ or commas;
// booleans are true/false; empty = unknown.
import { TODAY } from "./config";
import { daysBetween, findDuplicates, hasNoOwner, isStale } from "./accounts";
import { GROUPS, groupOf } from "./radar-view";
import { TYPE_META } from "./radar-meta";
import type { CsvRow } from "./csv";
import type { RadarItem } from "./schemas";
import type { Account } from "./types";
import type { Store } from "./store";

export const POWERBI_FILES = ["accounts.csv", "promises.csv", "radar_items.csv", "audit_log.csv"] as const;

const bool = (b: boolean) => (b ? "true" : "false");

function hiddenStatus(store: Store | null, id: string): "active" | "done" | "snoozed" | "dismissed" {
  const a = store?.radar[id];
  if (!a) return "active";
  if (a.status === "snoozed") return a.until && a.until > TODAY ? "snoozed" : "active";
  return a.status;
}

export function accountsTable(base: Account[], store: Store | null): CsvRow[] {
  const groups = findDuplicates(base);
  const rows: CsvRow[] = [];
  const add = (a: Account, isNew: boolean, edited: boolean) => {
    const dup = groups.find((g) => g.lead_ids.includes(a.lead_id));
    rows.push({
      lead_id: a.lead_id,
      company: a.company,
      contact_name: a.contact_name,
      contact_email: a.contact_email,
      owner: a.owner,
      status: a.status,
      service_interest: a.service_interest,
      source: a.source,
      est_value_usd: a.est_value_usd,
      created_date: a.created_date,
      last_contact_date: a.last_contact_date,
      next_followup_date: a.next_followup_date,
      days_since_last_contact: a.last_contact_date ? daysBetween(a.last_contact_date, TODAY) : null,
      is_stale: bool(!isNew && isStale(a)),
      has_owner: bool(!hasNoOwner(a)),
      duplicate_of: dup ? dup.lead_ids.filter((id) => id !== a.lead_id).join("|") : null,
      duplicate_kind: dup ? dup.kind : null,
      is_new_lead: bool(isNew),
      updated_in_debrief: bool(edited),
      notes: a.notes,
    });
  };
  for (const a of base) {
    const edits = store?.accountEdits[a.lead_id];
    add(edits ? ({ ...a, ...edits } as Account) : a, false, !!edits);
  }
  for (const n of store?.newLeads ?? []) {
    const blank: Account = {
      lead_id: n.lead_id, company: "(new lead)", contact_name: null, contact_email: null, source: null, service_interest: null,
      status: "New", est_value_usd: null, owner: null, created_date: null, last_contact_date: null, next_followup_date: null, notes: null,
    };
    add({ ...blank, ...n.fields } as Account, true, false);
  }
  return rows;
}

export function promisesTable(items: RadarItem[], store: Store | null): CsvRow[] {
  const rows: CsvRow[] = items
    .filter((i) => i.type === "promise_overdue" || i.type === "promise_due")
    .map((i) => {
      const done = hiddenStatus(store, i.id) === "done";
      const overdue = i.type === "promise_overdue" || (i.days_overdue ?? 0) > 0;
      return {
        promise_id: i.id,
        lead_id: i.lead_ids.length === 1 ? i.lead_ids[0] : null,
        account: i.account,
        owner: i.owner,
        promise: i.summary,
        due_date: i.due_date,
        date_clear: bool(i.date_clear),
        days_overdue: i.days_overdue,
        status: done ? "done" : overdue ? "overdue" : "open",
        found_in: "radar",
        approved_on: null,
        source_file: i.evidence[0]?.file ?? null,
        source_quote: i.evidence[0]?.quote ?? null,
      };
    });
  for (const p of store?.promises ?? []) {
    const late = p.due_date ? daysBetween(p.due_date, TODAY) : null;
    rows.push({
      promise_id: p.id,
      lead_id: p.lead_id,
      account: p.account,
      owner: p.owner,
      promise: p.what,
      due_date: p.due_date,
      date_clear: bool(p.date_clear),
      days_overdue: late !== null && late > 0 ? late : null,
      status: p.status === "done" ? "done" : late !== null && late > 0 ? "overdue" : "open",
      found_in: "debrief",
      approved_on: p.approved_on,
      source_file: null,
      source_quote: p.quote,
    });
  }
  return rows;
}

export function radarTable(items: RadarItem[], store: Store | null): CsvRow[] {
  return items.map((i, idx) => ({
    item_id: i.id,
    rank: idx + 1,
    lead_id: i.lead_ids.length === 1 ? i.lead_ids[0] : null,
    related_lead_ids: i.lead_ids.length > 1 ? i.lead_ids.join("|") : null,
    account: i.account,
    in_crm: bool(i.lead_ids.length > 0),
    type: i.type,
    type_label: TYPE_META[i.type].label,
    radar_group: GROUPS.find((g) => g.key === groupOf(i))?.title ?? null,
    found_by: i.source,
    owner: i.owner,
    value_usd: i.value_usd,
    value_source: i.value_source,
    due_date: i.due_date,
    date_clear: bool(i.date_clear),
    days_waiting: i.days_waiting,
    days_overdue: i.days_overdue,
    days_until_due: i.days_until,
    score: i.score,
    status: hiddenStatus(store, i.id),
    summary: i.summary,
    suggested_next_action: i.suggested_next_action,
    source_file: i.evidence[0]?.file ?? null,
    source_quote: i.evidence[0]?.quote ?? null,
  }));
}

export function auditTable(store: Store | null): CsvRow[] {
  return (store?.audit ?? []).map((e, idx) => ({
    change_id: idx + 1,
    lead_id: e.lead_id,
    account: e.account,
    field: e.field,
    value_before: e.before,
    value_after: e.after,
    edited_before_approval: bool(e.edited),
    approved_by: e.who,
    approved_on: e.when,
    source_quote: e.quote,
  }));
}

// Header-only file for an empty table, so Power BI still sees the columns.
export const AUDIT_COLUMNS = ["change_id", "lead_id", "account", "field", "value_before", "value_after", "edited_before_approval", "approved_by", "approved_on", "source_quote"];
