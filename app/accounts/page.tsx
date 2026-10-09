import AccountsList, { type AccountRow } from "@/components/AccountsList";
import { accounts, documentsFor } from "@/lib/data";
import { duplicatesFor, findDuplicates, hasNoOwner, isStale } from "@/lib/accounts";

export default function AccountsPage() {
  const dupes = findDuplicates(accounts);
  const rows: AccountRow[] = accounts.map((a) => {
    const d = duplicatesFor(a.lead_id, dupes);
    return {
      account: a,
      docCount: documentsFor(a.lead_id).length,
      stale: isStale(a),
      noOwner: hasNoOwner(a),
      duplicate: d.some((g) => g.kind === "duplicate")
        ? "duplicate"
        : d.length
          ? "possible_duplicate"
          : null,
    };
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Accounts</h1>
        <p className="mt-1 text-slate-600">
          All {accounts.length} CRM records, with linked emails and meeting notes. Click one to see its history.
        </p>
      </div>
      <AccountsList rows={rows} />
    </div>
  );
}
