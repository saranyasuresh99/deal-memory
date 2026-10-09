// Merge Step A (rules) + Step B (AI signals), de-duplicate per account+type, score and sort.
import { TODAY } from "./config";
import { daysBetween } from "./accounts";
import { formatDate } from "./format";
import type { Account } from "./types";
import type { AiSignal, RadarItem } from "./schemas";
import type { RuleItem } from "./rules";

export function aiSignalToItem(s: AiSignal, idx: number, accounts: Account[]): RuleItem {
  const acc = s.lead_id ? accounts.find((a) => a.lead_id === s.lead_id) : undefined;
  const value =
    s.value_usd !== null
      ? { value_usd: s.value_usd, value_source: "quote" as const }
      : acc?.est_value_usd != null
        ? { value_usd: acc.est_value_usd, value_source: "crm" as const }
        : { value_usd: null, value_source: null };
  const diff = s.due_date ? daysBetween(TODAY, s.due_date) : null; // + = in future, - = overdue
  return {
    id: `${s.type}:${s.lead_id ?? s.account}:${idx}`,
    type: s.type,
    source: "ai",
    account: acc?.company ?? s.account,
    lead_ids: s.lead_id ? [s.lead_id] : [],
    summary: s.summary,
    evidence: [{ file: s.file, quote: s.quote }],
    owner: s.owner,
    ...value,
    due_date: s.due_date,
    date_clear: s.date_clear,
    days_waiting: null,
    days_overdue: diff !== null && diff < 0 ? -diff : null,
    days_until: diff !== null && diff >= 0 ? diff : null,
    suggested_next_action: s.suggested_next_action,
  };
}

// Value weight: $40k is neutral (1.0). Unknown value is neutral too, and shown as "value unknown".
function valueWeight(v: number | null): number {
  if (v === null) return 1;
  return Math.min(2.5, Math.max(0.5, v / 40000));
}

function deadlineUrgency(i: RuleItem): number {
  if (i.days_overdue !== null) return 85;
  if (i.days_until === null) return 50;
  const d = i.days_until;
  return d <= 3 ? 95 : d <= 7 ? 85 : d <= 14 ? 65 : d <= 30 ? 45 : 25;
}

// Urgency 0–100: how soon this costs money if nobody acts.
function urgency(i: RuleItem): number {
  switch (i.type) {
    case "waiting_on_us": {
      // Peaks after ~2 weeks; threads older than 60 days are going cold and slowly drop back.
      const d = i.days_waiting ?? 0;
      return d <= 60 ? Math.min(90, 40 + 3 * d) : Math.max(45, 90 - (d - 60) / 4);
    }
    case "promise_overdue":
      return i.days_overdue !== null ? Math.min(95, 50 + 2 * i.days_overdue) : 55;
    case "client_deadline":
      return deadlineUrgency(i);
    case "promise_due":
      return deadlineUrgency(i) - 10;
    case "returning_lost":
      return 75;
    case "revisit_due":
      return i.days_overdue !== null ? 60 : i.days_until !== null && i.days_until <= 7 ? 70 : 45;
    case "referral":
      return 55;
    case "lead_missing":
      return 50;
    case "no_owner":
      return 45;
    case "cross_sell":
      return 40;
    case "possible_duplicate":
      return 35;
    case "contradiction":
      return 35;
    case "missing_next_step":
      return 30;
    case "stale_deal":
      return i.days_waiting === null ? 30 : 20 + Math.min(i.days_waiting, 120) / 4;
  }
}

function urgencyText(i: RuleItem): string {
  if (i.type === "waiting_on_us") return `Waiting ${i.days_waiting} days`;
  if (i.type === "returning_lost") return `Came back ${i.days_waiting} days ago`;
  if (i.type === "stale_deal") return i.days_waiting === null ? "Never contacted" : `No contact for ${i.days_waiting} days`;
  if (i.days_overdue !== null) return `Overdue by ${i.days_overdue} day${i.days_overdue === 1 ? "" : "s"} (was due ${formatDate(i.due_date)})`;
  if (i.days_until !== null) return i.days_until === 0 ? `Due today (${formatDate(i.due_date)})` : `Due in ${i.days_until} day${i.days_until === 1 ? "" : "s"} (${formatDate(i.due_date)})`;
  if (["promise_overdue", "promise_due", "client_deadline", "revisit_due"].includes(i.type)) {
    return i.date_clear ? "No date given" : "Date unclear";
  }
  return "";
}

export function rank(raw: RuleItem[]): RadarItem[] {
  const scored = raw.map((i) => ({
    ...i,
    score: Math.round(valueWeight(i.value_usd) * urgency(i) * 10) / 10,
    urgency_text: urgencyText(i),
    merged: 1,
  }));

  // De-duplicate per account + type: keep the most urgent card, attach the other evidence to it.
  const groups = new Map<string, RadarItem[]>();
  for (const i of scored) {
    const key = `${i.lead_ids[0] ?? i.account}|${i.type}`;
    groups.set(key, [...(groups.get(key) ?? []), i]);
  }
  const merged: RadarItem[] = [...groups.values()].map((g) => {
    g.sort((a, b) => b.score - a.score);
    const [top, ...rest] = g;
    const evidence = [...top.evidence];
    for (const r of rest) for (const e of r.evidence) if (!evidence.some((x) => x.file === e.file && x.quote === e.quote)) evidence.push(e);
    return { ...top, evidence, merged: g.length };
  });

  return merged.sort((a, b) => b.score - a.score || a.account.localeCompare(b.account));
}
