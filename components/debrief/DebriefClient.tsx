"use client";

import Link from "next/link";
import { useState } from "react";
import SpeechInput from "./SpeechInput";
import ProposalView from "./ProposalView";
import AuditLog from "./AuditLog";
import type { Account } from "@/lib/types";
import type { DebriefResponse, DebriefResult, MatchCandidate } from "@/lib/schemas";

export type Sample = { id: string; label: string; mode: "speak" | "paste"; text: string };

type View =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "demo"; message: string; matcher: MatchCandidate[] }
  | { kind: "result"; result: DebriefResult; mode: "demo" | "live"; removed: number; runId: number };

export default function DebriefClient({
  samples,
  accounts,
  duplicatePairs,
}: {
  samples: Sample[];
  accounts: Account[];
  duplicatePairs: string[][];
}) {
  const [mode, setMode] = useState<"speak" | "paste">("speak");
  const [text, setText] = useState("");
  const [view, setView] = useState<View>({ kind: "idle" });
  const [runs, setRuns] = useState(0);

  async function submit(input: string) {
    if (!input.trim()) return;
    setView({ kind: "loading" });
    try {
      const res = await fetch("/api/debrief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input }),
      });
      const data = (await res.json()) as DebriefResponse;
      if ("error" in data) setView({ kind: "error", message: data.error });
      else if (data.demo) setView({ kind: "demo", message: data.message, matcher: data.matcher });
      else {
        setRuns((n) => n + 1);
        setView({ kind: "result", result: data.result, mode: data.mode, removed: data.removed_claims, runId: runs + 1 });
      }
    } catch {
      setView({ kind: "error", message: "Something went wrong — please try again." });
    }
  }

  function pickSample(s: Sample) {
    setMode(s.mode);
    setText(s.text);
    submit(s.text);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="mb-3 flex gap-1 rounded-lg bg-slate-100 p-1 text-sm">
          {(["speak", "paste"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 rounded-md px-3 py-1.5 font-medium ${mode === m ? "bg-white shadow-sm" : "text-slate-600"}`}
            >
              {m === "speak" ? "Speak a debrief" : "Paste message / email"}
            </button>
          ))}
        </div>

        <SpeechInput mode={mode} value={text} onChange={setText} />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() => submit(text)}
            disabled={!text.trim() || view.kind === "loading"}
            className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-40"
          >
            {view.kind === "loading" ? "Working…" : "Propose CRM update"}
          </button>
          {text && (
            <button onClick={() => { setText(""); setView({ kind: "idle" }); }} className="text-sm text-slate-500 hover:underline">
              Clear
            </button>
          )}
        </div>

        <div className="mt-4">
          <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">Try a sample</div>
          <div className="flex flex-wrap gap-2">
            {samples.map((s, i) => (
              <button
                key={s.id}
                onClick={() => pickSample(s)}
                className="rounded-full border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:border-accent-600 hover:bg-accent-50"
              >
                {i + 1}. {s.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {view.kind === "error" && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{view.message}</div>
      )}

      {view.kind === "demo" && (
        <section className="space-y-3">
          <div className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700">{view.message}</div>
          <div className="rounded-xl border border-slate-200 p-4 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Rule-based account matcher (no AI)</h2>
            {view.matcher.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">No CRM account matches this text — it may be a new lead.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {view.matcher.map((c) => (
                  <li key={c.lead_id}>
                    <Link href={`/accounts/${c.lead_id}`} className="font-medium text-accent-700 hover:underline">
                      {c.company}
                    </Link>{" "}
                    <span className="text-slate-400">{c.lead_id}</span>
                    <span className="block text-xs text-slate-500">{c.reason}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {view.kind === "result" && (
        <section className="space-y-2">
          <p className="text-xs text-slate-500">
            {view.mode === "demo" ? "Demo mode: this proposal was pre-generated with Claude during the build." : "Live AI proposal."} Nothing
            changes in the CRM until you approve it.
            {view.removed > 0 && ` ${view.removed} claim(s) were dropped because their quote was not found in the text.`}
          </p>
          <ProposalView key={view.runId} result={view.result} accounts={accounts} duplicatePairs={duplicatePairs} />
        </section>
      )}

      <AuditLog />
    </div>
  );
}
