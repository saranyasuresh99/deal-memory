// npm run radar
// Merges Step A (rules, plain code) with Step B (data/ai_signals.json) into data/radar.json.
// Live mode (ANTHROPIC_API_KEY set): regenerates data/ai_signals.json with Claude first.
// Pass --no-ai to skip regeneration even when a key is present.
import fs from "node:fs";
import path from "node:path";
import { MODELS, TODAY } from "../lib/config";
import { friendlyError, isLiveMode } from "../lib/ai";
import { structuredSonnet } from "../lib/claude";
import { RADAR_SYSTEM, radarUserPrompt } from "../lib/prompts";
import { runRules } from "../lib/rules";
import { aiSignalToItem, rank } from "../lib/ranking";
import { quoteInText } from "../lib/quotes";
import { AiSignalListSchema, type AiBundleResult, type AiSignalsFile, type RadarFile } from "../lib/schemas";
import type { Account, DocumentRecord } from "../lib/types";

const ROOT = path.resolve(__dirname, "..");
const read = <T>(p: string): T => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));

try {
  process.loadEnvFile(path.join(ROOT, ".env.local"));
} catch {
  // no .env.local -> Demo mode
}

const accounts = read<Account[]>("data/accounts.json");
const documents = read<DocumentRecord[]>("data/documents.json");
const csvText = fs.readFileSync(path.join(ROOT, "data/raw/crm_export.csv"), "utf8");
const docText = new Map(documents.map((d) => [d.id, d.text]));

function sourceText(file: string): string | null {
  return file === "crm_export.csv" ? csvText : docText.get(file) ?? null;
}

async function regenerateWithClaude(): Promise<void> {
  const existing = read<AiSignalsFile>("data/ai_signals.json");
  const bundles: AiBundleResult[] = [];
  for (const b of existing.bundles) {
    const account = b.lead_id ? accounts.find((a) => a.lead_id === b.lead_id) ?? null : null;
    const docs = documents.filter((d) => (b.lead_id ? d.linked_lead_ids.includes(b.lead_id) : d.unmatched_companies.includes(b.account)));
    if (docs.length === 0 && account) {
      bundles.push({ ...b, signals: [] });
      continue;
    }
    try {
      const { signals } = await structuredSonnet({
        system: RADAR_SYSTEM,
        user: radarUserPrompt({ account, company: b.account, docs }),
        schema: AiSignalListSchema,
      });
      bundles.push({ ...b, signals: signals.map((s) => ({ ...s, account: b.account, lead_id: b.lead_id })) });
      console.log(`  ${b.bundle_id}: ${signals.length} signal(s)`);
    } catch (err) {
      console.log(`  ${b.bundle_id}: ${friendlyError(err)} — keeping previous signals`);
      bundles.push(b);
    }
  }
  const out: AiSignalsFile = { ...existing, generated_by: `Claude ${MODELS.reasoning} (Live mode)`, mode: "live", today: TODAY, bundles };
  fs.writeFileSync(path.join(ROOT, "data/ai_signals.json"), JSON.stringify(out, null, 2) + "\n");
}

async function main() {
  const live = isLiveMode() && !process.argv.includes("--no-ai");
  if (live) {
    console.log("Live mode: regenerating data/ai_signals.json with Claude…");
    await regenerateWithClaude();
  } else {
    console.log("Demo mode: using pre-generated data/ai_signals.json");
  }

  const ai = read<AiSignalsFile>("data/ai_signals.json");
  const ruleItems = runRules(accounts, documents, csvText);
  const aiItems = ai.bundles.flatMap((b) => b.signals.map((s, i) => aiSignalToItem(s, i, accounts)));

  // Final anti-hallucination guard: drop evidence whose quote is not in its source; drop items left with none.
  let dropped = 0;
  const checked = [...ruleItems, ...aiItems].flatMap((item) => {
    const evidence = item.evidence.filter((e) => {
      const src = sourceText(e.file);
      return src !== null && quoteInText(e.quote, src);
    });
    if (evidence.length === 0) {
      dropped++;
      console.log(`  dropped (unverified quote): ${item.id}`);
      return [];
    }
    return [{ ...item, evidence }];
  });

  const items = rank(checked);
  const radar: RadarFile = {
    today: TODAY,
    mode: ai.mode,
    generated_from: ["data/accounts.json", "data/documents.json", "data/ai_signals.json"],
    items,
  };
  fs.writeFileSync(path.join(ROOT, "data/radar.json"), JSON.stringify(radar, null, 2) + "\n");

  const byType = new Map<string, number>();
  for (const i of items) byType.set(i.type, (byType.get(i.type) ?? 0) + 1);
  console.log(`\nStep A rule items: ${ruleItems.length}   Step B AI signals: ${aiItems.length}   dropped by quote check: ${dropped}`);
  console.log(`radar.json: ${items.length} cards after de-duplication`);
  console.log([...byType].map(([t, n]) => `  ${t}: ${n}`).join("\n"));
  console.log("\nTop 10:");
  items.slice(0, 10).forEach((i, n) =>
    console.log(`${String(n + 1).padStart(2)}. [${i.score}] ${i.type} — ${i.account} — ${i.value_usd ? "$" + i.value_usd.toLocaleString("en-US") : "value unknown"} — ${i.urgency_text}`),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
