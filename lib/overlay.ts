// Apply approved edits (from the browser store) on top of the base CRM data.
import type { Account } from "./types";
import type { Store } from "./store";

export function applyEdits(a: Account, store: Store): Account {
  const edits = store.accountEdits[a.lead_id];
  return edits ? ({ ...a, ...edits } as Account) : a;
}

export function newLeadAccounts(store: Store): Account[] {
  return store.newLeads.map(
    (n) =>
      ({
        lead_id: n.lead_id,
        company: "(new lead)",
        contact_name: null,
        contact_email: null,
        source: null,
        service_interest: null,
        status: "New",
        est_value_usd: null,
        owner: null,
        created_date: null,
        last_contact_date: null,
        next_followup_date: null,
        notes: null,
        ...n.fields,
      }) as Account,
  );
}
