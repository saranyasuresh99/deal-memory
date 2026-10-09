export type Account = {
  lead_id: string;
  company: string;
  contact_name: string | null;
  contact_email: string | null;
  source: string | null;
  service_interest: string | null;
  status: string | null;
  est_value_usd: number | null;
  owner: string | null;
  created_date: string | null;
  last_contact_date: string | null;
  next_followup_date: string | null;
  notes: string | null;
};

export type Message = {
  from_name: string | null;
  from_email: string | null;
  to: string | null;
  cc: string | null;
  date: string | null;
};

export type LinkVia = "contact_email" | "email_domain" | "lead_id" | "company_name";

export type DocLink = { lead_id: string; via: LinkVia };

export type DocumentRecord = {
  id: string; // file name, e.g. "2026-06-16_meridian_proposal_questions.md"
  type: "email" | "note";
  date: string;
  title: string;
  from: string | null;
  to: string | null;
  text: string; // editorial notes removed
  messages: Message[]; // emails only; one per message in the thread
  linked_lead_ids: string[];
  links: DocLink[];
  linked_companies: string[];
  unmatched_companies: string[]; // companies named in the doc that are not in the CRM
};

export type EditorialNote = { note: string; context: string | null };

// A single citation. `quote` must appear verbatim (case/whitespace-insensitive) in `file`.
export type Citation = { file: string; quote: string };
