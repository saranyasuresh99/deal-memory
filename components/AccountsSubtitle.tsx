"use client";

import { useStore } from "@/lib/store";

export default function AccountsSubtitle({ crmCount }: { crmCount: number }) {
  const n = useStore().newLeads.length;
  return (
    <>
      {n > 0 ? `${crmCount} CRM records + ${n} new lead${n === 1 ? "" : "s"} from Debrief` : `All ${crmCount} CRM records`}, with linked
      emails and meeting notes. Click one to see its history.
    </>
  );
}
