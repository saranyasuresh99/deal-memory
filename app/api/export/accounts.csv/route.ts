// GET /api/export/accounts.csv — read-only, for Power BI's Web connector.
// Base CRM data only (approvals saved in a browser are not on the server).
import { accounts } from "@/lib/data";
import { accountsTable } from "@/lib/powerbi";
import { csvResponse } from "@/lib/export-response";

export const dynamic = "force-static";

export function GET() {
  return csvResponse("accounts.csv", accountsTable(accounts, null));
}
