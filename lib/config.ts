// Single source of truth for "today". The app never uses the real system date.
export const TODAY = "2026-07-10";
export const TODAY_LABEL = "10 Jul 2026";

// Live-mode models (used only when ANTHROPIC_API_KEY is set on the server).
export const MODELS = {
  extraction: "claude-haiku-4-5-20251001", // extraction / matching / debrief
  reasoning: "claude-sonnet-5-5", // radar reasoning, brief, ask
} as const;

// A deal with no contact for longer than this is "stale".
export const STALE_DAYS = 30;

// The domain AtliQ people email from. Anyone else is a client/prospect.
export const INTERNAL_DOMAIN = "atliq.com";

// Exact refusal sentence for Ask (rule 7).
export const REFUSAL =
  "I don't have enough information in the CRM, emails or notes to answer that.";
