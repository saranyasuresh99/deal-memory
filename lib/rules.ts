// Step A — Radar rules in plain code (no AI). Every item cites the exact text it is based on.
import { INTERNAL_DOMAIN, TODAY } from "./config";
import { daysAgo, daysBetween, findDuplicates, hasNoOwner, isOpen, isStale } from "./accounts";
import { emailDomain } from "./matching";
import type { Account, DocumentRecord } from "./types";
import type { RadarItem } from "./schemas";
import { formatDate } from "./format";

export type RuleItem = Omit<RadarItem, "score" | "urgency_text" | "merged">;

const CRM_FILE = "crm_export.csv";

function blank(partial: Partial<RuleItem> & Pick<RuleItem, "id" | "type" | "account" | "summary" | "evidence" | "suggested_next_action">): RuleItem {
  return {
    source: "rule",
    lead_ids: [],
    owner: null,
    value_usd: null,
    value_source: null,
    due_date: null,
    date_clear: true,
    days_waiting: null,
    days_overdue: null,
    days_until: null,
    ...partial,
  };
}

// The raw CSV line for a lead — used as verifiable evidence for CRM-based rules.
export function crmLines(csvText: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of csvText.split(/\r?\n/)) {
    const m = line.match(/^(L-\d{4}),/);
    if (m) map.set(m[1], line);
  }
  return map;
}

function valueOf(a: Account | undefined): Pick<RuleItem, "value_usd" | "value_source"> {
  return a?.est_value_usd != null ? { value_usd: a.est_value_usd, value_source: "crm" } : { value_usd: null, value_source: null };
}

// Body of the last message in an email thread (header lines removed).
function lastMessageBody(doc: DocumentRecord): string {
  const chunks = doc.text.split(/\n---\n/);
  return chunks[chunks.length - 1]
    .split("\n")
    .filter((l) => !/^\*\*(From|To|Cc|Date|Subject):\*\*/i.test(l) && !/^#/.test(l))
    .join("\n")
    .trim();
}

// First substantial sentence of a block of text (always an exact substring, so it verifies).
export function firstSentence(body: string): string {
  const line =
    body.split("\n").map((l) => l.trim()).find((l) => l.length >= 30 && !l.startsWith("#") && !l.startsWith("**")) ??
    body.split("\n").map((l) => l.trim()).find((l) => l.length > 0) ??
    body;
  const m = line.match(/^.*?[.?!](?=\s|$)/);
  return (m && m[0].length >= 20 ? m[0] : line).trim();
}

// The sentence where the client asks us for something (a question or a request); falls back to the first sentence.
// Sentences are cut from single lines, so the result is always an exact substring of the source.
export function keySentence(body: string): string {
  const sentences = body
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && !l.startsWith("**"))
    .flatMap((l) => l.split(/(?<=[.?!])\s+/))
    .map((s) => s.trim())
    .filter((s) => s.length >= 20);
  return (
    sentences.find((s) => s.includes("?")) ??
    sentences.find((s) => /\b(please|need|can you|could you|would|when can)/i.test(s)) ??
    firstSentence(body)
  );
}

// "8 July confirmed. Bring the template." / "Monday 13th, 11am works." — a confirmation, not a question to us.
function isConfirmation(body: string): boolean {
  return body.length < 120 && !body.includes("?") && /\b(works|confirmed|see you)\b/i.test(body);
}

// The "Attendees:" / "Present:" line of a meeting note, lower-cased ("" if none).
function attendees(text: string): string {
  return (text.match(/(?:Attendees|Present):\**\s*([^\n]*)/i)?.[1] ?? "").toLowerCase();
}

// How to address a client in a suggested action: first name, but keep the full name when it starts with a
// title or an initial ("Dr. Lisa Wong", "Mr. Naidu", "R. Subramaniam") so we never end up with just "Dr.".
export function addressName(name: string | null): string {
  if (!name) return "the client";
  const parts = name.trim().split(/\s+/);
  const first = parts[0];
  const isTitle = /^(dr|mr|mrs|ms|prof)\.?$/i.test(first);
  const isInitial = /^([A-Z]\.)+$/.test(first);
  return isTitle || isInitial ? parts.join(" ") : first;
}

function firstName(nameAndEmail: string | null): string | null {
  if (!nameAndEmail) return null;
  const m = nameAndEmail.match(/^\s*([^<,]+?)\s*</);
  return m ? m[1].split(" ")[0] : null;
}

function accountForEmail(email: string | null, accounts: Account[]): Account | undefined {
  if (!email) return undefined;
  return (
    accounts.find((a) => a.contact_email?.toLowerCase() === email) ??
    accounts.find((a) => emailDomain(a.contact_email) === emailDomain(email))
  );
}

export function runRules(accounts: Account[], documents: DocumentRecord[], csvText: string): RuleItem[] {
  const items: RuleItem[] = [];
  const lines = crmLines(csvText);
  const crmEvidence = (a: Account) => [{ file: CRM_FILE, quote: lines.get(a.lead_id)! }];

  // ---- Waiting on us: thread's latest message is from a client ----
  for (const doc of documents.filter((d) => d.type === "email" && d.messages.length)) {
    const last = doc.messages[doc.messages.length - 1];
    if (!last.from_email || emailDomain(last.from_email) === INTERNAL_DOMAIN || !last.date) continue;
    const body = lastMessageBody(doc);
    if (isConfirmation(body)) continue;

    const acc = accountForEmail(last.from_email, accounts);
    const company = acc?.company ?? doc.unmatched_companies[0];
    if (!company) continue;

    // Skip if a later meeting WITH this client (listed as attendee), or a later AtliQ email to them, shows we responded.
    // Internal notes that merely mention the client don't count.
    const clientDomain = emailDomain(last.from_email);
    const clientSurname = (last.from_name ?? "").split(" ").pop()!.toLowerCase();
    const answeredLater = documents.some(
      (d) =>
        d.date > last.date! &&
        (acc ? d.linked_lead_ids.includes(acc.lead_id) : d.unmatched_companies.includes(company)) &&
        ((d.type === "note" && attendees(d.text).includes(clientSurname)) ||
          d.messages.some((m) => emailDomain(m.from_email) === INTERNAL_DOMAIN && (m.to ?? "").toLowerCase().includes(clientDomain!))),
    );
    if (answeredLater) continue;

    const days = daysBetween(last.date, TODAY);
    const who = last.from_name ?? last.from_email;
    items.push(
      blank({
        id: `waiting_on_us:${doc.id}`,
        type: "waiting_on_us",
        account: company,
        lead_ids: acc ? [acc.lead_id] : [],
        summary: `${who} (${company}) wrote on ${formatDate(last.date)} and the thread has no reply from AtliQ — waiting ${days} days.`,
        evidence: [{ file: doc.id, quote: keySentence(body) }],
        owner: acc?.owner ?? firstName(last.to),
        ...valueOf(acc),
        days_waiting: days,
        suggested_next_action: `Reply to ${addressName(who)} — answer what they asked in the ${formatDate(last.date)} message.`,
      }),
    );
  }

  // ---- Stale deal ----
  for (const a of accounts.filter(isStale)) {
    const days = a.last_contact_date ? daysAgo(a.last_contact_date) : null;
    items.push(
      blank({
        id: `stale_deal:${a.lead_id}`,
        type: "stale_deal",
        account: a.company,
        lead_ids: [a.lead_id],
        summary: days === null
          ? `Open deal (${a.status ?? "no status"}) with no last-contact date in the CRM.`
          : `Open deal (${a.status ?? "no status"}) — CRM shows no contact for ${days} days (since ${formatDate(a.last_contact_date)}).`,
        evidence: crmEvidence(a),
        owner: a.owner,
        ...valueOf(a),
        days_waiting: days,
        suggested_next_action: "Check the inbox for newer activity, then update last contact and next follow-up in the CRM.",
      }),
    );
  }

  // ---- No owner ----
  for (const a of accounts.filter(hasNoOwner)) {
    items.push(
      blank({
        id: `no_owner:${a.lead_id}`,
        type: "no_owner",
        account: a.company,
        lead_ids: [a.lead_id],
        summary: `Nobody owns this ${a.status ?? "unqualified"} lead in the CRM.`,
        evidence: crmEvidence(a),
        ...valueOf(a),
        suggested_next_action: "Assign an owner in the CRM.",
      }),
    );
  }

  // ---- Missing next step (ONE summary card) ----
  const noNext = accounts.filter((a) => isOpen(a) && a.next_followup_date === null);
  if (noNext.length) {
    items.push(
      blank({
        id: "missing_next_step:all",
        type: "missing_next_step",
        account: "Whole pipeline",
        lead_ids: noNext.map((a) => a.lead_id),
        summary: `${noNext.length} of ${accounts.filter(isOpen).length} open deals have no next follow-up date in the CRM.`,
        evidence: [{ file: CRM_FILE, quote: "next_followup_date" }],
        suggested_next_action: "In the weekly pipeline review, give every open deal a next step and a date.",
      }),
    );
  }

  // ---- Lead missing from CRM ----
  const unmatched = [...new Set(documents.flatMap((d) => d.unmatched_companies))];
  for (const company of unmatched) {
    const docs = documents.filter((d) => d.unmatched_companies.includes(company));
    const doc = docs[0];
    const key = company.split(" ")[0].toLowerCase();
    const lines = doc.text.split("\n").map((l) => l.trim());
    const line = lines.find((l) => l.toLowerCase().includes(key) && !l.startsWith("#") && !l.startsWith("**")) ??
      lines.find((l) => l.toLowerCase().includes(key))!;
    items.push(
      blank({
        id: `lead_missing:${company}`,
        type: "lead_missing",
        account: company,
        summary: `${company} appears in ${docs.length} document${docs.length > 1 ? "s" : ""} but is not in the CRM.`,
        evidence: [{ file: doc.id, quote: line.replace(/^#+\s*/, "") }],
        suggested_next_action: `Create a CRM lead for ${company} and assign an owner.`,
      }),
    );
  }

  // ---- Possible duplicate (never merged automatically) ----
  for (const g of findDuplicates(accounts)) {
    const [a, b] = g.lead_ids.map((id) => accounts.find((x) => x.lead_id === id)!);
    items.push(
      blank({
        id: `possible_duplicate:${g.lead_ids.join("+")}`,
        type: "possible_duplicate",
        account: a.company,
        lead_ids: g.lead_ids,
        summary: `${g.kind === "duplicate" ? "Duplicate" : "Possible duplicate"}: ${a.lead_id} and ${b.lead_id}. ${g.reason}`,
        evidence: [...crmEvidence(a), ...crmEvidence(b)],
        owner: a.owner,
        ...valueOf(a),
        suggested_next_action: g.kind === "duplicate"
          ? `Owners ${a.owner ?? "?"} and ${b.owner ?? "?"} agree which record to keep (no automatic merge).`
          : "Decide: same opportunity (merge by hand) or a genuine second deal (keep both).",
      }),
    );
  }

  // ---- Returning "Lost" deal: client wrote again after the deal was marked Lost ----
  for (const a of accounts.filter((x) => x.status === "Lost")) {
    for (const doc of documents.filter((d) => d.linked_lead_ids.includes(a.lead_id) && d.type === "email")) {
      const chunks = doc.text.split(/\n---\n/);
      const idx = doc.messages.findIndex(
        (m) => m.date && a.last_contact_date && m.date > a.last_contact_date && emailDomain(m.from_email) === emailDomain(a.contact_email),
      );
      if (idx === -1) continue;
      const m = doc.messages[idx];
      const body = chunks[idx].split("\n").filter((l) => !/^\*\*|^#/.test(l)).join("\n");
      items.push(
        blank({
          id: `returning_lost:${a.lead_id}`,
          type: "returning_lost",
          account: a.company,
          lead_ids: [a.lead_id],
          summary: `Marked Lost in the CRM, but ${m.from_name} came back on ${formatDate(m.date)}.`,
          evidence: [{ file: doc.id, quote: keySentence(body) }],
          owner: a.owner,
          ...valueOf(a),
          days_waiting: daysBetween(m.date!, TODAY),
          suggested_next_action: "Re-open the deal in the CRM and agree the next step with the client.",
        }),
      );
      break;
    }
  }

  return items;
}
