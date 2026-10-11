// npm run verify            -> checks data/ai_signals.json and data/precomputed/*.json
// npm run verify -- <file>  -> checks only the given file(s)
//
// Rule 5 (anti-hallucination): every AI claim carries {file, quote}. This script checks that each
// quote really appears in its source text and REMOVES any claim whose quote is not found.
//
// Source resolution for `file`:
//   "<document id>.md"  -> that email / meeting note (editorial notes already stripped)
//   "crm_export.csv"    -> the raw CRM export
//   "debrief" or no file -> the nearest enclosing `input` string (the debrief text itself)
//
// What counts as a claim (inside any array):
//   - an object with a `quote` field           -> removed if its quote fails
//   - an object with a `citations` array       -> bad citations dropped; removed if none remain
import fs from "node:fs";
import path from "node:path";
import type { DocumentRecord } from "../lib/types";
import { quoteInText } from "../lib/quotes";

const ROOT = path.resolve(__dirname, "..");
const documents: DocumentRecord[] = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "documents.json"), "utf8"));
const docText = new Map(documents.map((d) => [d.id, d.text]));
const crmText = fs.readFileSync(path.join(ROOT, "data", "raw", "crm_export.csv"), "utf8");

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
type Citation = { file?: unknown; quote?: unknown };

let checked = 0;
const removed: string[] = [];

function sourceFor(file: unknown, debriefInput: string | null): string | null {
  // Debrief outputs ({field, quote} / {owner, what, quote}) cite the debrief text itself.
  if (file === undefined || file === "debrief") return debriefInput;
  if (typeof file !== "string") return null;
  if (file === "crm_export.csv") return crmText;
  return docText.get(path.basename(file)) ?? null;
}

function citationOk(c: Citation, debriefInput: string | null, where: string): boolean {
  checked++;
  const src = sourceFor(c.file, debriefInput);
  if (typeof c.quote !== "string" || src === null) {
    removed.push(`${where}: unknown source "${String(c.file)}"`);
    return false;
  }
  if (!quoteInText(c.quote, src)) {
    removed.push(`${where}: quote not found in ${String(c.file)} -> "${c.quote}"`);
    return false;
  }
  return true;
}

function isObj(x: Json): x is { [k: string]: Json } {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function clean(node: Json, debriefInput: string | null, where: string): Json {
  if (Array.isArray(node)) {
    const out: Json[] = [];
    node.forEach((item, i) => {
      const w = `${where}[${i}]`;
      if (isObj(item)) {
        const input = typeof item.input === "string" ? item.input : debriefInput;
        if ("quote" in item && !citationOk(item as Citation, input, w)) return;
        if (Array.isArray(item.citations)) {
          const kept = item.citations.filter((c, j) => isObj(c) && citationOk(c as Citation, input, `${w}.citations[${j}]`));
          if (kept.length === 0) {
            removed.push(`${w}: removed (no valid citations left)`);
            return;
          }
          // Citations are already checked — clean the rest of the item without checking them twice.
          const { citations: _checked, ...rest } = item;
          void _checked;
          out.push({ ...(clean(rest, debriefInput, w) as { [k: string]: Json }), citations: kept });
          return;
        }
      }
      out.push(clean(item, debriefInput, w));
    });
    return out;
  }
  if (isObj(node)) {
    const input = typeof node.input === "string" ? node.input : debriefInput;
    const out: { [k: string]: Json } = {};
    for (const [k, v] of Object.entries(node)) out[k] = clean(v, input, `${where}.${k}`);
    return out;
  }
  return node;
}

function targets(): string[] {
  const args = process.argv.slice(2);
  if (args.length) return args.map((a) => path.resolve(a));
  const list = [path.join(ROOT, "data", "ai_signals.json")];
  const pre = path.join(ROOT, "data", "precomputed");
  if (fs.existsSync(pre)) {
    for (const f of fs.readdirSync(pre).filter((f) => f.endsWith(".json"))) list.push(path.join(pre, f));
  }
  return list.filter((f) => fs.existsSync(f));
}

const files = targets();
if (files.length === 0) {
  console.log("No AI output files yet (data/ai_signals.json, data/precomputed/*.json). Nothing to verify.");
  process.exit(0);
}

for (const f of files) {
  const before = removed.length;
  const checkedBefore = checked;
  const data = JSON.parse(fs.readFileSync(f, "utf8")) as Json;
  const cleaned = clean(data, null, path.basename(f));
  const n = removed.length - before;
  if (n > 0) fs.writeFileSync(f, JSON.stringify(cleaned, null, 2) + "\n");
  console.log(`${path.relative(ROOT, f)}: ${checked - checkedBefore} quotes checked, ${n} problem(s)${n ? " -> unsupported claims removed" : ""}`);
}

if (removed.length) {
  console.log("\nRemoved:");
  removed.forEach((r) => console.log("  - " + r));
  process.exit(1);
}
console.log("\nAll quotes verified.");
