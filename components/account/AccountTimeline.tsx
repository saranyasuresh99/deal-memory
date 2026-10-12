"use client";

import { useState } from "react";
import DocPanel from "../DocPanel";
import { Card, SectionTitle } from "../ui";
import { useRegisterExport } from "../shell/ExportContext";
import { formatDate } from "@/lib/format";
import type { TimelineEvent } from "@/lib/timeline";
import type { DocumentRecord, LinkVia } from "@/lib/types";

const VIA_LABEL: Record<LinkVia, string> = {
  contact_email: "matched by contact email",
  email_domain: "matched by email domain",
  lead_id: "mentions the lead ID",
  company_name: "mentions the company",
};

// Full memory timeline: every linked email and meeting note plus CRM dates, newest first. Click to read a document.
export default function AccountTimeline({ leadId, events, docs }: { leadId: string; events: TimelineEvent[]; docs: DocumentRecord[] }) {
  const [open, setOpen] = useState<DocumentRecord | null>(null);
  const byId = new Map(docs.map((d) => [d.id, d]));

  useRegisterExport(`${leadId}-timeline.csv`, () =>
    events.map((e) => ({ date: e.date, type: e.kind, title: e.title, detail: e.detail ?? "", file: e.docId ?? "" })),
  );

  return (
    <Card className="p-5">
      <SectionTitle right={<span className="text-xs text-muted">{docs.length} linked document{docs.length === 1 ? "" : "s"}</span>}>
        Memory timeline
      </SectionTitle>
      {docs.length === 0 && <p className="mb-3 text-sm text-muted">No history found for this account.</p>}
      <ol className="relative space-y-4 pl-5 before:absolute before:top-1.5 before:bottom-1.5 before:left-[5px] before:w-px before:bg-tint-2">
        {events.map((t, i) => {
          const doc = t.docId ? byId.get(t.docId) : undefined;
          const via = doc?.links.find((l) => l.lead_id === leadId)?.via;
          return (
            <li key={i} className="relative">
              <span className={`absolute top-1.5 -left-5 h-[11px] w-[11px] rounded-full border-2 ${t.kind === "CRM" ? "border-dq-fg bg-surface" : i === 0 ? "border-brand bg-brand" : "border-brand bg-surface"}`} />
              {doc ? (
                <button onClick={() => setOpen(doc)} className="text-left text-sm font-medium text-ink hover:text-brand">
                  {t.title}
                </button>
              ) : (
                <div className="text-sm text-ink">{t.title}</div>
              )}
              <div className="text-xs text-muted">
                {formatDate(t.date)} · {t.kind}
                {t.detail ? ` · ${t.detail}` : ""}
                {via ? ` · ${VIA_LABEL[via]}` : ""}
              </div>
              {doc && (
                <p className="mt-1 line-clamp-2 text-xs text-muted">{doc.text.replace(/^#.*$/m, "").replace(/\*\*/g, "").trim()}</p>
              )}
            </li>
          );
        })}
      </ol>
      <DocPanel doc={open} onClose={() => setOpen(null)} />
    </Card>
  );
}
