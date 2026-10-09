import { z } from "zod";

// ---------- Step B: AI signals (same schema in Demo and Live mode) ----------
export const AI_SIGNAL_TYPES = [
  "promise_overdue", // AtliQ promised something by a date (or with no date) and nothing shows it was delivered
  "promise_due", // AtliQ promised something with a date that has not passed yet
  "cross_sell",
  "referral",
  "revisit_due",
  "contradiction", // CRM status/fields disagree with the documents
  "client_deadline", // a date the client needs something by
] as const;

export const AiSignalSchema = z.object({
  type: z.enum(AI_SIGNAL_TYPES),
  account: z.string().describe("Company name as written in the CRM, or as written in the documents if not in the CRM"),
  lead_id: z.string().nullable().describe("CRM lead_id, or null if the company is not in the CRM"),
  summary: z.string().describe("One sentence, plain English, facts only"),
  quote: z.string().describe("Exact words copied from the source file that prove the signal"),
  file: z.string().describe("Source file name, e.g. 2026-06-16_meridian_proposal_questions.md, or crm_export.csv"),
  owner: z.string().nullable().describe("AtliQ person responsible, only if stated or obvious from the documents; else null"),
  due_date: z.string().nullable().describe("YYYY-MM-DD, only if the date is unambiguous; else null"),
  date_clear: z.boolean().describe("false when a date was mentioned but cannot be resolved unambiguously, or no date was given"),
  value_usd: z.number().nullable().describe("Only if a value is stated in the quote or CRM; lower bound of a stated range; else null"),
  suggested_next_action: z.string().describe("A next step for an AtliQ person. Never 'send automatically'."),
});
export type AiSignal = z.infer<typeof AiSignalSchema>;

export const AiSignalListSchema = z.object({ signals: z.array(AiSignalSchema) });

export type AiBundleResult = {
  bundle_id: string; // lead_id, or "unmatched:<company>"
  account: string;
  lead_id: string | null;
  signals: AiSignal[];
};

export type AiSignalsFile = {
  generated_by: string;
  mode: "demo" | "live";
  today: string;
  note: string;
  bundles: AiBundleResult[];
};

// ---------- Merged Radar items ----------
export const RULE_TYPES = [
  "waiting_on_us",
  "stale_deal",
  "no_owner",
  "missing_next_step",
  "lead_missing",
  "possible_duplicate",
  "returning_lost",
] as const;

export type RadarType = (typeof RULE_TYPES)[number] | (typeof AI_SIGNAL_TYPES)[number];

export type Evidence = { file: string; quote: string };

export type RadarItem = {
  id: string;
  type: RadarType;
  source: "rule" | "ai";
  account: string;
  lead_ids: string[];
  summary: string;
  evidence: Evidence[];
  owner: string | null;
  value_usd: number | null;
  value_source: "crm" | "quote" | null;
  due_date: string | null;
  date_clear: boolean;
  days_waiting: number | null;
  days_overdue: number | null;
  days_until: number | null;
  urgency_text: string;
  suggested_next_action: string;
  score: number;
  merged: number; // how many raw signals were de-duplicated into this card
};

export type RadarFile = {
  today: string;
  mode: "demo" | "live";
  generated_from: string[];
  items: RadarItem[];
};
