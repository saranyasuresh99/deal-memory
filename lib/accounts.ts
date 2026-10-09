import { STALE_DAYS, TODAY } from "./config";
import { companyAliases, emailDomain } from "./matching";
import type { Account } from "./types";

const DAY = 24 * 60 * 60 * 1000;

// Whole days from `from` to `to` (ISO dates). Positive when `to` is later.
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to + "T00:00:00Z") - Date.parse(from + "T00:00:00Z")) / DAY);
}

export function daysAgo(date: string): number {
  return daysBetween(date, TODAY);
}

export function isOpen(a: Account): boolean {
  return a.status !== "Won" && a.status !== "Lost";
}

export function isStale(a: Account): boolean {
  if (!isOpen(a)) return false;
  return a.last_contact_date === null || daysAgo(a.last_contact_date) > STALE_DAYS;
}

export function hasNoOwner(a: Account): boolean {
  return a.owner === null;
}

export type DuplicateGroup = {
  lead_ids: string[];
  kind: "duplicate" | "possible_duplicate";
  reason: string;
};

function normLocal(email: string): string {
  return email.split("@")[0].toLowerCase().replace(/[._-]/g, "");
}

function normName(name: string | null): string | null {
  if (!name) return null;
  return name.toLowerCase().replace(/^(dr|mr|mrs|ms|prof)\.?\s+/, "").replace(/[^a-z ]/g, "").trim();
}

// Pairs of CRM rows that look like the same client. We only FLAG them — never merge (rule 4).
export function findDuplicates(accounts: Account[]): DuplicateGroup[] {
  const groups: DuplicateGroup[] = [];
  for (let i = 0; i < accounts.length; i++) {
    for (let j = i + 1; j < accounts.length; j++) {
      const a = accounts[i];
      const b = accounts[j];
      const ea = a.contact_email?.toLowerCase() ?? null;
      const eb = b.contact_email?.toLowerCase() ?? null;
      const sameDomain = ea && eb && emailDomain(ea) === emailDomain(eb);
      const ids = [a.lead_id, b.lead_id];

      if (ea && ea === eb) {
        const sameService = a.service_interest === b.service_interest;
        groups.push({
          lead_ids: ids,
          kind: sameService ? "duplicate" : "possible_duplicate",
          reason: sameService
            ? `Same contact email (${ea}) and same service interest.`
            : `Same contact (${a.contact_name ?? ea}, ${ea}) but different service interest (${a.service_interest ?? "blank"} vs ${b.service_interest ?? "blank"}) — could be a genuine second opportunity.`,
        });
      } else if (sameDomain && (normLocal(ea!) === normLocal(eb!) || (normName(a.contact_name) && normName(a.contact_name) === normName(b.contact_name)))) {
        groups.push({
          lead_ids: ids,
          kind: "duplicate",
          reason: `Same person at ${emailDomain(ea)} entered twice with slightly different emails (${ea} vs ${eb}) by different owners (${a.owner ?? "no owner"} / ${b.owner ?? "no owner"}).`,
        });
      } else {
        const shared = companyAliases(a.company).filter((al) => companyAliases(b.company).includes(al));
        if (shared.length) {
          groups.push({
            lead_ids: ids,
            kind: "possible_duplicate",
            reason: `Similar company names ("${a.company}" / "${b.company}").`,
          });
        }
      }
    }
  }
  return groups;
}

export function duplicatesFor(leadId: string, groups: DuplicateGroup[]): DuplicateGroup[] {
  return groups.filter((g) => g.lead_ids.includes(leadId));
}
