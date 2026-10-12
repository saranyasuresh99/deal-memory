// Memory timeline: an account's linked documents and CRM dates, newest first. Built from the data, no AI.
import { normalizeForQuote } from "./quotes";
import type { Account, DocumentRecord } from "./types";

export type TimelineEvent = {
  date: string;
  kind: "email" | "meeting note" | "CRM";
  title: string;
  detail: string | null;
  docId: string | null;
};

function lastDate(d: DocumentRecord): string {
  const dates = d.messages.map((m) => m.date).filter((x): x is string => !!x);
  return dates.length ? dates.sort().at(-1)! : d.date;
}

export function timelineFor(account: Account | null, docs: DocumentRecord[]): TimelineEvent[] {
  const events: TimelineEvent[] = docs.map((d) => {
    const last = d.messages.at(-1);
    return {
      date: lastDate(d),
      kind: d.type === "email" ? "email" : "meeting note",
      title: d.title,
      detail: d.type === "email" && last?.from_name ? `last message from ${last.from_name}` : null,
      docId: d.id,
    };
  });
  if (account?.last_contact_date) {
    events.push({ date: account.last_contact_date, kind: "CRM", title: "Last contact logged in the CRM", detail: null, docId: null });
  }
  if (account?.created_date) {
    events.push({ date: account.created_date, kind: "CRM", title: "Lead created in the CRM", detail: null, docId: null });
  }
  // Newest first; on the same day, documents before CRM events.
  return events.sort((a, b) => b.date.localeCompare(a.date) || (a.kind === "CRM" ? 1 : 0) - (b.kind === "CRM" ? 1 : 0));
}

// Date of the message (in a thread) that contains the quote; falls back to the document date.
export function quoteDate(doc: DocumentRecord, quote: string): string {
  const q = normalizeForQuote(quote);
  const chunks = doc.text.split(/\n---\n/);
  const idx = chunks.findIndex((c) => normalizeForQuote(c).includes(q));
  const msg = idx >= 0 ? doc.messages[idx] : undefined;
  return msg?.date ?? doc.date;
}
