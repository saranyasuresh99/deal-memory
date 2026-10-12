// How the Radar page groups, labels and summarises items (design/DESIGN.md §3). Pure functions, no I/O.
import { TODAY } from "./config";
import { daysBetween } from "./accounts";
import { formatShort, formatUsdShort, weekday } from "./format";
import type { RadarItem, RadarType } from "./schemas";
import type { Account } from "./types";

export type GroupKey = "action" | "week" | "later" | "revenue" | "quality";

export const GROUPS: { key: GroupKey; title: string; dot: string; noun: string; collapsed: boolean }[] = [
  { key: "action", title: "Needs action today", dot: "bg-navy", noun: "items", collapsed: false },
  { key: "week", title: "Due this week", dot: "bg-[#e0a100]", noun: "items", collapsed: false },
  { key: "later", title: "Coming up", dot: "bg-[#f2cf7a]", noun: "items", collapsed: false },
  { key: "revenue", title: "Hidden revenue", dot: "bg-rev-fg", noun: "opportunities", collapsed: false },
  { key: "quality", title: "Data quality", dot: "bg-dq-fg", noun: "items", collapsed: true },
];

const HIDDEN_REVENUE: RadarType[] = ["cross_sell", "referral", "revisit_due", "returning_lost"];

export function groupOf(i: RadarItem): GroupKey {
  switch (i.type) {
    case "waiting_on_us":
    case "promise_overdue":
    case "returning_lost":
      return "action";
    case "promise_due":
    case "client_deadline":
      if ((i.days_overdue ?? 0) > 0 || i.days_until === 0) return "action";
      if (i.days_until !== null && i.days_until <= 7) return "week";
      return "later";
    case "cross_sell":
    case "referral":
    case "revisit_due":
      return "revenue";
    default:
      return "quality"; // stale, no owner, duplicates, missing next step, lead missing, CRM contradiction
  }
}

// Types that represent something AtliQ owes the client (used for "What AtliQ owes").
export const OWED_TYPES: RadarType[] = ["waiting_on_us", "promise_overdue", "promise_due", "client_deadline", "returning_lost", "revisit_due"];

export function accountKey(i: { lead_ids: string[]; account: string }): string {
  return i.lead_ids.length === 1 ? i.lead_ids[0] : i.lead_ids.length === 0 ? `co:${i.account}` : `multi:${i.lead_ids.join("+")}`;
}

function dateFromAgo(days: number): string {
  const d = new Date(TODAY + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

// Main line + muted sub-line for the WAITING / DUE column.
export function waitingDue(i: RadarItem): { main: string; sub: string } {
  if (i.type === "waiting_on_us" || i.type === "returning_lost") {
    const d = i.days_waiting ?? 0;
    return { main: `${d} day${d === 1 ? "" : "s"}`, sub: `since ${formatShort(dateFromAgo(d))}` };
  }
  if (i.type === "stale_deal") {
    return i.days_waiting === null ? { main: "Never", sub: "no contact logged" } : { main: `${i.days_waiting} days`, sub: "since last CRM contact" };
  }
  if (i.days_overdue !== null) return { main: `${i.days_overdue}d overdue`, sub: `was due ${formatShort(i.due_date)}` };
  if (i.days_until !== null && i.due_date) {
    if (i.days_until === 0) return { main: "Due today", sub: `${i.type === "promise_due" ? "promised" : "due"} ${formatShort(i.due_date)}` };
    return { main: `${weekday(i.due_date)} ${formatShort(i.due_date)}`, sub: `${i.days_until} day${i.days_until === 1 ? "" : "s"} left` };
  }
  if (["promise_overdue", "promise_due", "client_deadline", "revisit_due"].includes(i.type)) {
    return i.date_clear ? { main: "No date", sub: "none was given" } : { main: "Date unclear", sub: "not resolved" };
  }
  return { main: "—", sub: "" };
}

// Short "21d" / "in 5d" for the What AtliQ owes list.
export function owedDays(i: RadarItem): string {
  if (i.type === "waiting_on_us" || i.type === "returning_lost") return `${i.days_waiting}d`;
  if (i.days_overdue !== null) return `${i.days_overdue}d late`;
  if (i.days_until !== null) return i.days_until === 0 ? "today" : `in ${i.days_until}d`;
  return "";
}

export function contextLine(i: RadarItem, accounts: Map<string, Account>): string {
  if (i.type === "missing_next_step") return `Whole pipeline · ${i.lead_ids.length} deals`;
  if (i.lead_ids.length === 0) return "not in CRM";
  if (i.lead_ids.length > 1) return i.lead_ids.join(" + ");
  const a = accounts.get(i.lead_ids[0]);
  if (i.type === "returning_lost") return `${i.lead_ids[0]} · CRM says Lost`;
  return `${i.lead_ids[0]} · ${a?.contact_name ?? "no contact"}`;
}

export function valueText(i: RadarItem): string | null {
  if (i.value_usd === null) return null;
  return `${i.value_source === "quote" ? "~" : ""}$${i.value_usd.toLocaleString("en-US")}`;
}

export type AtStakeDeal = { key: string; account: string; lead_id: string | null; value: number | null; source: "crm" | "quote" | null; reasons: string[] };

// A deal is "open" unless the CRM says Won, or Lost without a returning-deal signal (design fix: Lost deals count
// only when the client came back). Companies not in the CRM have no status and count as open.
function isOpenDeal(leadId: string | null, accounts: Map<string, Account>, returning: Set<string>): boolean {
  if (!leadId) return true;
  const status = accounts.get(leadId)?.status ?? null;
  if (status === "Won") return false;
  if (status === "Lost") return returning.has(leadId);
  return true;
}

// KPI figures for the four cards (design/DESIGN.md §3.2). `items` = the active (not done/snoozed/dismissed) items;
// `accounts` = CRM rows with approved Debrief edits applied.
export function radarKpis(items: RadarItem[], accounts: Map<string, Account>) {
  const returning = new Set(items.filter((i) => i.type === "returning_lost").flatMap((i) => i.lead_ids));

  // At stake — each account once, open deals only, where a client is waiting on us or an AtliQ promise is
  // overdue or due today. Value = CRM est. value, else a value stated in a verified quote. Stale, data-quality and
  // hidden-revenue-only items never qualify.
  const qualifies = (i: RadarItem) =>
    i.type === "waiting_on_us" ||
    i.type === "promise_overdue" ||
    (i.type === "promise_due" && (i.days_until === 0 || (i.days_overdue ?? 0) > 0));
  const deals = new Map<string, AtStakeDeal>();
  for (const i of items.filter(qualifies)) {
    const leadId = i.lead_ids.length === 1 ? i.lead_ids[0] : null;
    if (!isOpenDeal(leadId, accounts, returning)) continue;
    const key = accountKey(i);
    const d = deals.get(key) ?? { key, account: i.account, lead_id: leadId, value: null, source: null, reasons: [] };
    d.reasons.push(i.type === "waiting_on_us" ? "client waiting on us" : i.type === "promise_overdue" ? "promise overdue" : "promise due today");
    deals.set(key, d);
  }
  for (const d of deals.values()) {
    const crm = d.lead_id ? accounts.get(d.lead_id)?.est_value_usd ?? null : null;
    const quoted = items
      .filter((i) => accountKey(i) === d.key && i.value_source === "quote" && i.value_usd !== null)
      .reduce<number | null>((m, i) => Math.max(m ?? 0, i.value_usd!), null);
    if (crm !== null) Object.assign(d, { value: crm, source: "crm" });
    else if (quoted !== null) Object.assign(d, { value: quoted, source: "quote" });
    d.reasons = [...new Set(d.reasons)];
  }
  const withValue = [...deals.values()].filter((d) => d.value !== null).sort((a, b) => b.value! - a.value!);
  const withoutValue = [...deals.values()].filter((d) => d.value === null);
  const total = withValue.reduce((s, d) => s + d.value!, 0);

  // Oldest client waiting — waiting-on-us items on open deals only (a Lost deal that never came back is a revisit,
  // not a client waiting for a reply).
  const waiting = items.filter((i) => i.type === "waiting_on_us");
  const oldest = waiting
    .filter((i) => isOpenDeal(i.lead_ids.length === 1 ? i.lead_ids[0] : null, accounts, returning))
    .reduce<RadarItem | null>((m, i) => (!m || (i.days_waiting ?? 0) > (m.days_waiting ?? 0) ? i : m), null);

  const overdue = items.filter((i) => i.type === "promise_overdue");
  const dueToday = items.filter((i) => i.type === "promise_due" && i.days_until === 0);

  const hidden = items.filter((i) => HIDDEN_REVENUE.includes(i.type));

  return {
    // "+" = more qualifying deals exist whose value is unknown (not counted in the sum)
    atStake: { text: `${formatUsdShort(total)}${withoutValue.length ? "+" : ""}`, deals: withValue, unknownValue: withoutValue },
    waiting: { count: waiting.length, oldest },
    overdue: { count: overdue.length, dueToday },
    hidden: { count: hidden.length },
  };
}

export function daysSince(date: string | null): number | null {
  return date ? daysBetween(date, TODAY) : null;
}
