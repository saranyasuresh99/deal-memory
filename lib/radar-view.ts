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

// KPI figures for the four cards (design/DESIGN.md §3.2). `items` = the active (not done/snoozed/dismissed) items.
export function radarKpis(items: RadarItem[]) {
  // At stake: deals where the client is waiting on an overdue AtliQ action
  // (a reply, an overdue promise, or a client deadline that has passed). One value per deal.
  const overdueAction = items.filter(
    (i) => i.type === "waiting_on_us" || i.type === "promise_overdue" || ((i.type === "client_deadline" || i.type === "promise_due") && (i.days_overdue ?? 0) > 0),
  );
  const deals = new Map<string, number | null>();
  for (const i of overdueAction) {
    const k = accountKey(i);
    const prev = deals.get(k) ?? null;
    deals.set(k, i.value_usd === null ? prev : Math.max(prev ?? 0, i.value_usd));
  }
  const known = [...deals.values()].filter((v): v is number => v !== null);
  const atStake = known.reduce((s, v) => s + v, 0);
  const anyUnknown = known.length < deals.size;

  const waiting = items.filter((i) => i.type === "waiting_on_us");
  const oldest = waiting.reduce<RadarItem | null>((m, i) => (!m || (i.days_waiting ?? 0) > (m.days_waiting ?? 0) ? i : m), null);

  const overdue = items.filter((i) => i.type === "promise_overdue");
  const dueToday = items.filter((i) => i.type === "promise_due" && i.days_until === 0);

  const hidden = items.filter((i) => HIDDEN_REVENUE.includes(i.type));

  return {
    atStake: { text: deals.size ? `${formatUsdShort(atStake)}${anyUnknown ? "+" : ""}` : "$0", deals: deals.size, withValue: known.length },
    waiting: { count: waiting.length, oldest },
    overdue: { count: overdue.length, dueToday },
    hidden: { count: hidden.length },
  };
}

export function daysSince(date: string | null): number | null {
  return date ? daysBetween(date, TODAY) : null;
}
