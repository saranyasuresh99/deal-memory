// Server-side post-processing for every debrief result (Live AI output AND precomputed Demo output).
// These checks run in plain code, so they hold even if the model misbehaves.
import { quoteInText } from "./quotes";
import { EDITABLE_FIELDS, type DebriefResult } from "./schemas";
import type { Account } from "./types";

// Text that tries to instruct an AI/system rather than describe a sales conversation.
const INJECTION_PATTERNS = [
  /ignore (all )?(the )?(previous|prior|above) instructions/i,
  /disregard (all )?(the )?(previous|prior|above)/i,
  /you are now/i,
  /system prompt/i,
  /mark (this|the) deal as (won|lost)/i,
];

export function detectInjection(text: string): boolean {
  return INJECTION_PATTERNS.some((re) => re.test(text));
}

export const INJECTION_WARNING =
  "This text contains instructions aimed at the AI (e.g. \"Ignore all previous instructions…\"). They were ignored: no status or value change is proposed from it.";

// Normalise text so a sample still matches after harmless edits (case, spacing, punctuation —
// speech-to-text often punctuates differently).
export function normalizeForMatch(s: string): string {
  return s.toLowerCase().replace(/['‘’]/g, "").replace(/[^a-z0-9@]+/g, " ").trim();
}

export function finalizeDebrief(
  raw: DebriefResult,
  text: string,
  accounts: Account[],
): { result: DebriefResult; removed: number } {
  let removed = 0;
  const keep = <T extends { quote: string }>(xs: T[]) =>
    xs.filter((x) => {
      const ok = quoteInText(x.quote, text);
      if (!ok) removed++;
      return ok;
    });

  const known = new Set(accounts.map((a) => a.lead_id));
  const candidates = raw.account_match.candidates.filter((c) => known.has(c.lead_id));
  const leadId = raw.account_match.lead_id && known.has(raw.account_match.lead_id) ? raw.account_match.lead_id : null;
  const account = leadId ? accounts.find((a) => a.lead_id === leadId) : undefined;
  const injection = detectInjection(text);

  let fields = keep(raw.fields).filter((f) => (EDITABLE_FIELDS as readonly string[]).includes(f.field));
  // company may only be set on a brand-new lead
  if (!raw.account_match.is_new_lead) fields = fields.filter((f) => f.field !== "company");
  // Rule 8: never let instruction-like text change status or value.
  if (injection) fields = fields.filter((f) => f.field !== "status" && f.field !== "est_value_usd");
  // old_value always comes from the CRM, never from the model.
  fields = fields.map((f) => ({ ...f, old_value: account ? (account[f.field as keyof Account] as string | number | null) ?? null : null }));

  const warnings = [...raw.warnings];
  if (injection && !warnings.includes(INJECTION_WARNING)) warnings.unshift(INJECTION_WARNING);

  return {
    result: {
      account_match: { ...raw.account_match, lead_id: leadId, candidates },
      fields,
      promises: keep(raw.promises),
      signals: keep(raw.signals),
      warnings,
    },
    removed,
  };
}
