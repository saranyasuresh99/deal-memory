// Evals: score the Radar against the editorial notes (the answer key). The answer key is NEVER given to the AI —
// it is only read here, after the Radar has been built, to measure it.
import { accountsMentioned, companyAliases, mentionsAlias } from "./matching";
import type { Account, DocumentRecord, EditorialNote } from "./types";
import type { RadarItem } from "./schemas";

// Phrases (from the spec) that mean "something was NOT done".
export const NOT_DONE_PATTERNS = [/no reply/i, /not sent/i, /never/i, /no one/i, /not started/i, /not answered/i];

// Broader check (not in the spec): other wordings in the answer key that also mean something was not done.
export const EXTRA_NOT_DONE_PATTERNS = [
  /no response/i, /nothing (was )?sent/i, /no [a-z]+( [a-z]+)? (was )?(ever )?(sent|scheduled|set)/i,
  /no confirmation/i, /no revisit/i, /not yet answered/i, /not arranged/i, /not done/i, /no work started/i,
  /no further (follow-up|nudge)/i, /nobody/i,
];

// Generic data-quality cards. A "strict" hit needs a more specific leak than these.
export const GENERIC_TYPES = new Set(["stale_deal", "no_owner", "missing_next_step"]);

export type NoteCheck = {
  file: string;
  note: string;
  context: string | null;
  account: string; // company name the note is about
  lead_ids: string[];
  matched_by: string; // how the account was determined
  hit: boolean;
  strict_hit: boolean; // hit by a specific leak, not only by a generic data-quality card
  radar_types: string[]; // Radar item types found for that account
};

// Work out which account a note is about, most specific first:
// lead IDs in the note → companies in the note → company in the document title → the document's links.
function noteAccount(
  note: string,
  context: string | null,
  doc: DocumentRecord | undefined,
  accounts: Account[],
  unmatched: string[],
): { account: string; lead_ids: string[]; matched_by: string } {
  const text = `${note} ${context ?? ""}`;
  const ids = [...new Set(text.match(/\bL-\d{4}\b/g) ?? [])].filter((id) => accounts.some((a) => a.lead_id === id));
  if (ids.length) return { account: accounts.find((a) => a.lead_id === ids[0])!.company, lead_ids: ids, matched_by: "lead ID in the note" };

  const um = unmatched.find((c) => companyAliases(c).some((al) => mentionsAlias(text, al)));
  if (um) return { account: um, lead_ids: [], matched_by: "company named in the note" };
  const inNote = accountsMentioned(text, accounts);
  if (inNote.length) return { account: inNote[0].company, lead_ids: inNote.map((a) => a.lead_id), matched_by: "company named in the note" };

  if (doc) {
    const umTitle = unmatched.find((c) => companyAliases(c).some((al) => mentionsAlias(doc.title, al)));
    if (umTitle) return { account: umTitle, lead_ids: [], matched_by: "company in the document title" };
    const inTitle = accountsMentioned(doc.title, accounts);
    if (inTitle.length) return { account: inTitle[0].company, lead_ids: inTitle.map((a) => a.lead_id), matched_by: "company in the document title" };
    if (doc.linked_lead_ids.length) {
      const a = accounts.find((x) => x.lead_id === doc.linked_lead_ids[0])!;
      return { account: a.company, lead_ids: [a.lead_id], matched_by: "document's linked account" };
    }
  }
  return { account: "(unknown)", lead_ids: [], matched_by: "not found" };
}

export function runEvals(
  answerKey: Record<string, EditorialNote[]>,
  documents: DocumentRecord[],
  accounts: Account[],
  radar: RadarItem[],
  patterns: RegExp[] = NOT_DONE_PATTERNS,
): { checks: NoteCheck[]; recall: number } {
  const unmatched = [...new Set(documents.flatMap((d) => d.unmatched_companies))];
  const checks: NoteCheck[] = [];
  for (const [file, notes] of Object.entries(answerKey)) {
    const doc = documents.find((d) => d.id === file);
    for (const n of notes) {
      if (!patterns.some((re) => re.test(n.note))) continue;
      const who = noteAccount(n.note, n.context, doc, accounts, unmatched);
      const items = radar.filter((i) =>
        who.lead_ids.length ? i.lead_ids.some((id) => who.lead_ids.includes(id)) && i.lead_ids.length <= 2 : i.account === who.account,
      );
      checks.push({
        file,
        note: n.note,
        context: n.context,
        ...who,
        hit: items.length > 0,
        strict_hit: items.some((i) => !GENERIC_TYPES.has(i.type)),
        radar_types: [...new Set(items.map((i) => i.type))],
      });
    }
  }
  const hits = checks.filter((c) => c.hit).length;
  return { checks, recall: checks.length ? hits / checks.length : 0 };
}
