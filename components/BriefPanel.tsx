"use client";

import { useState } from "react";
import CitedLines from "./CitedLines";
import DocPanel from "./DocPanel";
import { Card, btn } from "./ui";
import { Sparkles, TriangleAlert } from "lucide-react";
import { BRIEF_SECTIONS, type Brief, type BriefResponse } from "@/lib/schemas";
import type { Account, DocumentRecord } from "@/lib/types";
import { useStore } from "@/lib/store";
import { applyEdits } from "@/lib/overlay";

type View =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "message"; message: string }
  | { kind: "brief"; brief: Brief; mode: "demo" | "live"; removed: number };

export default function BriefPanel({ account, docs }: { account: Account; docs: DocumentRecord[] }) {
  const leadId = account.lead_id;
  // If an owner was approved via Debrief in this browser, the "no owner" warning no longer applies.
  const ownerNow = applyEdits(account, useStore()).owner;
  const [view, setView] = useState<View>({ kind: "idle" });
  const [open, setOpen] = useState<{ doc: DocumentRecord; quote: string } | null>(null);
  const byId = new Map(docs.map((d) => [d.id, d]));

  async function generate() {
    setView({ kind: "loading" });
    try {
      const res = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: leadId }),
      });
      const data = (await res.json()) as BriefResponse;
      if ("error" in data) setView({ kind: "error", message: data.error });
      else if ("brief" in data) setView({ kind: "brief", brief: data.brief, mode: data.mode, removed: data.removed_claims });
      else setView({ kind: "message", message: data.message }); // no history, or Demo-mode message
    } catch {
      setView({ kind: "error", message: "Something went wrong — please try again." });
    }
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold text-navy">
          <Sparkles size={18} className="text-brand" /> Pre-call brief
        </h2>
        <button onClick={generate} disabled={view.kind === "loading"} className={btn.primary}>
          {view.kind === "loading" ? "Generating…" : view.kind === "brief" ? "Regenerate" : "Generate pre-call brief"}
        </button>
      </div>

      {view.kind === "idle" && (
        <p className="mt-2 text-sm text-muted">Last touch, what they want, open promises and questions, deadlines and cross-sell hints — every line cited.</p>
      )}
      {view.kind === "error" && <p className="mt-3 rounded-control bg-danger-bg px-3 py-2 text-sm text-danger-fg">{view.message}</p>}
      {view.kind === "message" && <p className="mt-3 text-sm text-muted">{view.message}</p>}

      {view.kind === "brief" && (
        <div className="mt-4 space-y-5">
          <p className="text-xs text-muted">
            {view.mode === "demo" ? "Pre-generated with Claude during the build." : "Generated live by Claude."} Every line cites the
            email, note or CRM row it comes from.
            {view.removed > 0 && ` ${view.removed} line(s) were dropped because their quote could not be found.`}
          </p>
          {(() => {
            const warnings = view.brief.warnings.filter((w) => !(ownerNow && w.text.startsWith("No owner")));
            return warnings.length > 0 ? (
              <div className="rounded-card border border-[#f2cf7a] bg-warn-bg p-4">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-warn-fg">
                  <TriangleAlert size={16} /> Before the call
                </h3>
                <CitedLines lines={warnings} canOpen={(f) => byId.has(f)} onOpen={(f, quote) => setOpen({ doc: byId.get(f)!, quote })} />
              </div>
            ) : null;
          })()}
          {BRIEF_SECTIONS.filter((s) => s.key !== "warnings").map(({ key, label }) => (
            <div key={key}>
              <h3 className="mb-2 text-sm font-semibold text-navy">{label}</h3>
              {view.brief[key].length === 0 ? (
                <p className="text-sm text-muted">Nothing found in the record.</p>
              ) : (
                <CitedLines
                  lines={view.brief[key]}
                  canOpen={(f) => byId.has(f)}
                  onOpen={(f, quote) => setOpen({ doc: byId.get(f)!, quote })}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <DocPanel doc={open?.doc ?? null} highlight={open?.quote} onClose={() => setOpen(null)} />
    </Card>
  );
}
