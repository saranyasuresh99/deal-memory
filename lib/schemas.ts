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

// ---------- Debrief (POST /api/debrief) ----------
// CRM fields the AI may propose changes to. lead_id is never editable; company only for a new lead.
export const EDITABLE_FIELDS = [
  "company",
  "contact_name",
  "contact_email",
  "source",
  "service_interest",
  "status",
  "est_value_usd",
  "owner",
  "last_contact_date",
  "next_followup_date",
  "notes",
] as const;
export type EditableField = (typeof EDITABLE_FIELDS)[number];

export const DebriefSchema = z.object({
  account_match: z.object({
    lead_id: z.string().nullable().describe("Best matching CRM lead_id, or null if unsure or new"),
    candidates: z.array(z.object({ lead_id: z.string(), company: z.string(), reason: z.string() })),
    is_new_lead: z.boolean(),
    confidence: z.enum(["high", "medium", "low"]),
  }),
  fields: z.array(
    z.object({
      field: z.enum(EDITABLE_FIELDS),
      old_value: z.union([z.string(), z.number()]).nullable(),
      new_value: z.union([z.string(), z.number()]).nullable(),
      quote: z.string().describe("Exact words from the debrief text that support this change"),
    }),
  ),
  promises: z.array(
    z.object({
      owner: z.string().nullable(),
      what: z.string(),
      due_date: z.string().nullable(),
      date_clear: z.boolean(),
      quote: z.string(),
    }),
  ),
  signals: z.array(
    z.object({
      type: z.enum(AI_SIGNAL_TYPES),
      summary: z.string(),
      due_date: z.string().nullable(),
      date_clear: z.boolean(),
      quote: z.string(),
    }),
  ),
  warnings: z.array(z.string()).describe("Anything the user must know: unclear dates, possible duplicates, suspicious instructions"),
});
export type DebriefResult = z.infer<typeof DebriefSchema>;

export type MatchCandidate = { lead_id: string; company: string; contact_name: string | null; reason: string; score: number };

export type DebriefResponse =
  | { mode: "demo" | "live"; demo?: false; result: DebriefResult; matcher: MatchCandidate[]; removed_claims: number }
  | { mode: "demo"; demo: true; message: string; matcher: MatchCandidate[] }
  | { error: string };

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
