import type { Tone } from "@/components/Badge";
import type { RadarType } from "./schemas";

// Label + colour per leak type (red = waiting, orange = promises, green = opportunities,
// purple = revisit / returning, grey = data quality).
export const TYPE_META: Record<RadarType, { label: string; tone: Tone }> = {
  waiting_on_us: { label: "Waiting on us", tone: "red" },
  client_deadline: { label: "Client deadline", tone: "amber" },
  promise_overdue: { label: "Overdue promise", tone: "orange" },
  promise_due: { label: "Promise due", tone: "orange" },
  cross_sell: { label: "Cross-sell", tone: "green" },
  referral: { label: "Referral", tone: "green" },
  revisit_due: { label: "Revisit due", tone: "purple" },
  returning_lost: { label: "Returning 'Lost' deal", tone: "purple" },
  contradiction: { label: "CRM contradiction", tone: "grey" },
  stale_deal: { label: "Stale deal", tone: "grey" },
  no_owner: { label: "No owner", tone: "grey" },
  missing_next_step: { label: "Missing next step", tone: "grey" },
  lead_missing: { label: "Lead missing from CRM", tone: "grey" },
  possible_duplicate: { label: "Possible duplicate", tone: "grey" },
};
