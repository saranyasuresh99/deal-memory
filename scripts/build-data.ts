// npm run build-data
// Reads data/raw/* and writes:
//   data/accounts.json     — CRM rows, typed (empty -> null)
//   data/documents.json    — emails + notes WITHOUT editorial notes, linked to accounts
//   data/answer_key.json   — the stripped editorial notes (for /evals only, never AI input)
import fs from "node:fs";
import path from "node:path";
import type { Account, DocLink, DocumentRecord, EditorialNote, Message } from "../lib/types";
import { INTERNAL_DOMAIN } from "../lib/config";
import { accountsMentioned, emailDomain, extractEmails } from "../lib/matching";

const ROOT = path.resolve(__dirname, "..");
const RAW = path.join(ROOT, "data", "raw");
const OUT = path.join(ROOT, "data");

// ---------- CRM ----------
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); if (row.some((f) => f !== "")) rows.push(row); }
  return rows;
}

function buildAccounts(): Account[] {
  const [header, ...rows] = parseCsv(fs.readFileSync(path.join(RAW, "crm_export.csv"), "utf8"));
  return rows.map((r) => {
    const o: Record<string, string | null> = {};
    header.forEach((h, i) => {
      const v = (r[i] ?? "").trim();
      o[h.trim()] = v === "" ? null : v;
    });
    return {
      ...(o as unknown as Account),
      est_value_usd: o.est_value_usd === null ? null : Number(o.est_value_usd),
    };
  });
}

// ---------- Editorial notes ----------
// Italic parenthesised notes like *(No reply sent as of 2026-07-10.)* are the answer key.
const EDITORIAL_RE = /\*\(([\s\S]*?)\)\*/g;

function stripEditorial(raw: string): { text: string; notes: EditorialNote[] } {
  const notes: EditorialNote[] = [];
  for (const line of raw.split("\n")) {
    for (const m of line.matchAll(EDITORIAL_RE)) {
      const context = line.replace(EDITORIAL_RE, "").trim();
      notes.push({ note: m[1].trim(), context: context === "" ? null : context });
    }
  }
  const text = raw
    .replace(EDITORIAL_RE, "")
    .split("\n")
    .map((l) => l.replace(/\s+$/, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { text, notes };
}

// ---------- Email parsing ----------
function headerValue(chunk: string, name: string): string | null {
  const m = chunk.match(new RegExp(`^\\*\\*${name}:\\*\\*\\s*(.+)$`, "im"));
  return m ? m[1].trim() : null;
}

function parseMessages(text: string): Message[] {
  return text
    .split(/\n---\n/)
    .map((chunk): Message | null => {
      const fromRaw = headerValue(chunk, "From");
      if (!fromRaw) return null;
      const m = fromRaw.match(/^(.*?)\s*<([^>]+)>/);
      let to = headerValue(chunk, "To");
      let cc = headerValue(chunk, "Cc");
      // Some threads put CC inline in the To line: "Bhavin <...>, CC: David <...>"
      if (to && /,\s*CC:/i.test(to)) {
        const [t, c] = to.split(/,\s*CC:\s*/i);
        to = t.trim();
        cc = cc ? `${cc}, ${c.trim()}` : c.trim();
      }
      return {
        from_name: m ? m[1].trim() : fromRaw,
        from_email: m ? m[2].trim().toLowerCase() : null,
        to,
        cc,
        date: headerValue(chunk, "Date"),
      };
    })
    .filter((x): x is Message => x !== null);
}

// ---------- Companies not in the CRM ----------
const COMPANY_SUFFIX =
  "Foods|Fitness|Lending|Advisory|Agency|Labs|Hotels|Bank|Solar|Logistics|Industries|Clinics|Diagnostics|Analytics|Capital|Insurance|Realty|Textiles|Hospitality|Constructions|Group|Healthcare|Health|Pharma";
const COMPANY_RE = new RegExp(
  `\\b([A-Z][A-Za-z]+(?:\\s(?:&|and)\\s[A-Z][A-Za-z]+|\\s[A-Z][A-Za-z]+){0,2}\\s(?:${COMPANY_SUFFIX}))\\b`,
  "g",
);

function unmatchedCompanies(text: string, accounts: Account[]): string[] {
  const found = new Map<string, string>(); // key: first word -> longest name
  for (const m of text.matchAll(COMPANY_RE)) {
    const name = m[1].replace(/^(The|Our|At|Via|From|Meet|Intro)\s+/, "");
    if (accountsMentioned(name, accounts).length > 0) continue;
    const key = name.split(/\s/)[0].toLowerCase();
    if (!found.has(key) || found.get(key)!.length < name.length) found.set(key, name);
  }
  return [...found.values()];
}

// ---------- Linking ----------
function linkDocument(text: string, accounts: Account[]): DocLink[] {
  const links = new Map<string, DocLink>();
  const add = (lead_id: string, via: DocLink["via"]) => {
    if (!links.has(lead_id)) links.set(lead_id, { lead_id, via });
  };
  const external = [...new Set(extractEmails(text))].filter((e) => emailDomain(e) !== INTERNAL_DOMAIN);

  // 1) contact email  2) email domain (only for addresses with no exact match)
  for (const e of external) {
    const exact = accounts.filter((a) => a.contact_email?.toLowerCase() === e);
    exact.forEach((a) => add(a.lead_id, "contact_email"));
    if (exact.length === 0) {
      accounts
        .filter((a) => emailDomain(a.contact_email) === emailDomain(e))
        .forEach((a) => add(a.lead_id, "email_domain"));
    }
  }
  // 3) explicit lead IDs
  for (const m of text.matchAll(/\bL-\d{4}\b/g)) {
    if (accounts.some((a) => a.lead_id === m[0])) add(m[0], "lead_id");
  }
  // 4) company name (case-insensitive, with aliases like "Meridian" / "MedTrack")
  accountsMentioned(text, accounts).forEach((a) => add(a.lead_id, "company_name"));
  return [...links.values()];
}

// ---------- Main ----------
function main() {
  const accounts = buildAccounts();
  const documents: DocumentRecord[] = [];
  const answerKey: Record<string, EditorialNote[]> = {};

  for (const [folder, type] of [["emails", "email"], ["meeting_notes", "note"]] as const) {
    const dir = path.join(RAW, folder);
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md")).sort()) {
      const raw = fs.readFileSync(path.join(dir, file), "utf8").replace(/\r\n/g, "\n");
      const { text, notes } = stripEditorial(raw);
      if (notes.length) answerKey[file] = notes;

      const titleLine = text.match(/^#\s+(.+)$/m)?.[1] ?? file;
      const title = titleLine.replace(/^Email( Thread)?:\s*/, "").trim();
      const messages = type === "email" ? parseMessages(text) : [];
      const fileDate = file.slice(0, 10);
      const links = linkDocument(text, accounts);
      const unmatched = unmatchedCompanies(text, accounts);
      const linkedNames = links.map((l) => accounts.find((a) => a.lead_id === l.lead_id)!.company);

      documents.push({
        id: file,
        type,
        date: messages[0]?.date ?? fileDate,
        title,
        from: messages[0] ? (messages[0].from_email ? `${messages[0].from_name} <${messages[0].from_email}>` : messages[0].from_name) : null,
        to: messages[0]?.to ?? null,
        text,
        messages,
        linked_lead_ids: links.map((l) => l.lead_id),
        links,
        linked_companies: [...new Set([...linkedNames, ...unmatched])],
        unmatched_companies: unmatched,
      });
    }
  }

  documents.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

  // Safety check: editorial notes must never leak into AI/user-facing text.
  for (const d of documents) {
    if (/\*\(/.test(d.text)) throw new Error(`Editorial note left in ${d.id}`);
  }

  // Warn about external email domains that matched nothing (possible missing leads).
  const knownDomains = new Set(accounts.map((a) => emailDomain(a.contact_email)).filter(Boolean));
  for (const d of documents) {
    const unknown = [...new Set(extractEmails(d.text).map(emailDomain))].filter(
      (dom) => dom && dom !== INTERNAL_DOMAIN && !knownDomains.has(dom),
    );
    if (unknown.length) console.log(`  note: ${d.id} has non-CRM domain(s) ${unknown.join(", ")} -> ${d.unmatched_companies.join(", ") || "(no company name found)"}`);
  }

  fs.writeFileSync(path.join(OUT, "accounts.json"), JSON.stringify(accounts, null, 2) + "\n");
  fs.writeFileSync(path.join(OUT, "documents.json"), JSON.stringify(documents, null, 2) + "\n");
  fs.writeFileSync(path.join(OUT, "answer_key.json"), JSON.stringify(answerKey, null, 2) + "\n");

  const unmatchedAll = [...new Set(documents.flatMap((d) => d.unmatched_companies))];
  const noteCount = Object.values(answerKey).reduce((n, a) => n + a.length, 0);
  console.log(`accounts.json    ${accounts.length} accounts`);
  console.log(`documents.json   ${documents.length} documents (${documents.filter((d) => d.type === "email").length} emails, ${documents.filter((d) => d.type === "note").length} notes)`);
  console.log(`answer_key.json  ${noteCount} editorial notes from ${Object.keys(answerKey).length} files`);
  console.log(`unlinked docs    ${documents.filter((d) => d.linked_lead_ids.length === 0).map((d) => d.id).join(", ") || "none"}`);
  console.log(`not in CRM       ${unmatchedAll.join(", ") || "none"}`);
}

main();
