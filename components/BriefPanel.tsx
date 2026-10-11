"use client";

import { useState } from "react";
import CitedLines from "./CitedLines";
import DocPanel from "./DocPanel";
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
    <section className="rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Pre-call brief</h2>
        <button
          onClick={generate}
          disabled={view.kind === "loading"}
          className="rounded-lg bg-accent-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-40"
        >
          {view.kind === "loading" ? "Generating…" : view.kind === "brief" ? "Regenerate" : "Generate pre-call brief"}
        </button>
      </div>

      {view.kind === "error" && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{view.message}</p>}
      {view.kind === "message" && <p className="mt-3 text-sm text-slate-600">{view.message}</p>}

      {view.kind === "brief" && (
        <div className="mt-4 space-y-5">
          <p className="text-xs text-slate-500">
            {view.mode === "demo" ? "Pre-generated with Claude during the build." : "Generated live by Claude."} Every line cites the
            email, note or CRM row it comes from.
            {view.removed > 0 && ` ${view.removed} line(s) were dropped because their quote could not be found.`}
          </p>
          {(() => {
            const warnings = view.brief.warnings.filter((w) => !(ownerNow && w.text.startsWith("No owner")));
            return warnings.length > 0 ? (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
                <h3 className="mb-1.5 text-sm font-semibold text-amber-900">⚠ Before the call</h3>
                <CitedLines lines={warnings} canOpen={(f) => byId.has(f)} onOpen={(f, quote) => setOpen({ doc: byId.get(f)!, quote })} />
              </div>
            ) : null;
          })()}
          {BRIEF_SECTIONS.filter((s) => s.key !== "warnings").map(({ key, label }) => (
            <div key={key}>
              <h3 className="mb-1.5 text-sm font-semibold text-slate-700">{label}</h3>
              {view.brief[key].length === 0 ? (
                <p className="text-sm text-slate-400">Nothing found in the record.</p>
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
    </section>
  );
}
