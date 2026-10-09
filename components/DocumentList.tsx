"use client";

import { useState } from "react";
import DocPanel from "./DocPanel";
import type { DocumentRecord, LinkVia } from "@/lib/types";
import { formatDate } from "@/lib/format";

const VIA_LABEL: Record<LinkVia, string> = {
  contact_email: "matched by contact email",
  email_domain: "matched by email domain",
  lead_id: "mentions the lead ID",
  company_name: "mentions the company",
};

export default function DocumentList({ docs, leadId }: { docs: DocumentRecord[]; leadId: string }) {
  const [open, setOpen] = useState<DocumentRecord | null>(null);

  if (docs.length === 0) {
    return <p className="text-sm text-slate-500">No history found for this account.</p>;
  }

  return (
    <>
      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 shadow-sm">
        {docs.map((d) => {
          const via = d.links.find((l) => l.lead_id === leadId)?.via;
          return (
            <li key={d.id}>
              <button onClick={() => setOpen(d)} className="block w-full p-4 text-left hover:bg-slate-50">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-medium uppercase tracking-wide">{d.type === "email" ? "Email" : "Note"}</span>
                  <span>{formatDate(d.date)}</span>
                  {via && <span className="text-slate-400">· {VIA_LABEL[via]}</span>}
                </div>
                <div className="mt-1 font-medium text-slate-900">{d.title}</div>
                <div className="mt-1 line-clamp-2 text-sm text-slate-600">
                  {d.text.replace(/^#.*$/m, "").replace(/\*\*/g, "").trim()}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      <DocPanel doc={open} onClose={() => setOpen(null)} />
    </>
  );
}
