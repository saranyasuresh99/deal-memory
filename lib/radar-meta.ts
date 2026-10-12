import type { Tone } from "@/components/Badge";
import type { RadarType } from "./schemas";

// Label + pill colour per leak type (design/DESIGN.md §1): blue = waiting on us, amber = deadlines and our promises,
// teal = hidden revenue, grey = data quality.
export const TYPE_META: Record<RadarType, { label: string; tone: Tone }> = {
  waiting_on_us: { label: "Waiting on us", tone: "wait" },
  client_deadline: { label: "Client deadline", tone: "warn" },
  promise_overdue: { label: "Overdue promise", tone: "warn" },
  promise_due: { label: "Our promise", tone: "warn" },
  cross_sell: { label: "Cross-sell", tone: "rev" },
  referral: { label: "Referral", tone: "rev" },
  revisit_due: { label: "Revisit due", tone: "rev" },
  returning_lost: { label: "Returning deal", tone: "rev" },
  contradiction: { label: "CRM contradiction", tone: "dq" },
  stale_deal: { label: "Stale deal", tone: "dq" },
  no_owner: { label: "No owner", tone: "dq" },
  missing_next_step: { label: "Missing next step", tone: "dq" },
  lead_missing: { label: "Lead missing from CRM", tone: "dq" },
  possible_duplicate: { label: "Possible duplicate", tone: "dq" },
};
