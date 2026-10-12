// Counts the AI quotes in the committed Demo-mode output files and how many are found in their source —
// the same check `npm run verify` runs. Shown in the sidebar's Demo-mode card. Server only.
import aiSignals from "@/data/ai_signals.json";
import debriefs from "@/data/precomputed/debriefs.json";
import briefs from "@/data/precomputed/briefs.json";
import answers from "@/data/precomputed/answers.json";
import { documents } from "./data";
import { crmCsv } from "./grounding";
import { quoteInText } from "./quotes";

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

export function quoteStats(): { verified: number; total: number } {
  const docText = new Map(documents.map((d) => [d.id, d.text]));
  let total = 0;
  let verified = 0;

  const walk = (node: Json, input: string | null) => {
    if (Array.isArray(node)) return node.forEach((n) => walk(n, input));
    if (node === null || typeof node !== "object") return;
    const ctx = typeof node.input === "string" ? node.input : input;
    if (typeof node.quote === "string") {
      total++;
      const file = node.file;
      const src = file === undefined || file === "debrief" ? ctx : file === "crm_export.csv" ? crmCsv() : docText.get(String(file)) ?? null;
      if (src !== null && quoteInText(node.quote, src)) verified++;
    }
    for (const v of Object.values(node)) walk(v, ctx);
  };

  for (const f of [aiSignals, debriefs, briefs, answers]) walk(f as unknown as Json, null);
  return { verified, total };
}
