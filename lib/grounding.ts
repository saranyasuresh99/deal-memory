// Server-side anti-hallucination checks for Brief and Ask (rule 5) and the refusal rule (rule 7).
import fs from "node:fs";
import path from "node:path";
import { REFUSAL } from "./config";
import { quoteInText } from "./quotes";
import { documents } from "./data";
import { companyAliases, mentionsAlias } from "./matching";
import { BRIEF_SECTIONS, type AskResult, type Brief, type CitedLine } from "./schemas";
import type { DocumentRecord } from "./types";

let crmCache: string | null = null;
export function crmCsv(): string {
  if (crmCache === null) crmCache = fs.readFileSync(path.join(process.cwd(), "data", "raw", "crm_export.csv"), "utf8");
  return crmCache;
}

const docText = new Map(documents.map((d) => [d.id, d.text]));

function sourceText(file: string): string | null {
  if (file === "crm_export.csv") return crmCsv();
  return docText.get(path.basename(file)) ?? null;
}

// Keep only citations whose quote really appears in the named source; drop lines left with none.
// `removed` counts dropped lines (claims), not individual citations.
export function verifyLines(lines: CitedLine[]): { kept: CitedLine[]; removed: number } {
  let removed = 0;
  const kept: CitedLine[] = [];
  for (const line of lines) {
    const citations = line.citations.filter((c) => {
      const src = sourceText(c.file);
      return src !== null && quoteInText(c.quote, src);
    });
    if (citations.length) kept.push({ ...line, citations });
    else removed++;
  }
  return { kept, removed };
}

export function finalizeBrief(raw: Brief): { brief: Brief; removed: number } {
  let removed = 0;
  const brief = {} as Brief;
  for (const { key } of BRIEF_SECTIONS) {
    const r = verifyLines(raw[key]);
    brief[key] = r.kept;
    removed += r.removed;
  }
  return { brief, removed };
}

// If the answer is a refusal, or nothing it says survives the quote check, return exactly the refusal sentence.
export function finalizeAnswer(raw: AskResult): { result: AskResult; removed: number } {
  const looksLikeRefusal = raw.refused || raw.answer.trim().toLowerCase() === REFUSAL.toLowerCase();
  if (looksLikeRefusal) return { result: { answer: REFUSAL, points: [], refused: true }, removed: raw.points.length };
  const { kept, removed } = verifyLines(raw.points);
  if (kept.length === 0) return { result: { answer: REFUSAL, points: [], refused: true }, removed };
  return { result: { answer: raw.answer, points: kept, refused: false }, removed };
}

// Ask context: documents about companies named in the question; if none are named, all documents
// (the whole dataset is small). Capped at ~60k characters (~15k tokens), newest first.
const MAX_DOC_CHARS = 60_000;
export function documentsForQuestion(question: string): DocumentRecord[] {
  const named = documents.filter((d) => d.linked_companies.some((c) => companyAliases(c).some((al) => mentionsAlias(question, al))));
  const pool = (named.length ? named : documents).slice().sort((a, b) => b.date.localeCompare(a.date));
  const out: DocumentRecord[] = [];
  let used = 0;
  for (const d of pool) {
    if (used + d.text.length > MAX_DOC_CHARS) break;
    out.push(d);
    used += d.text.length;
  }
  return out;
}
