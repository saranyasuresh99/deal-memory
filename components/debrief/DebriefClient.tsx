"use client";

import Link from "next/link";
import { useState } from "react";
import { Check } from "lucide-react";
import SpeechInput from "./SpeechInput";
import ProposalView, { type Phase } from "./ProposalView";
import { Card, Segmented, btn } from "../ui";
import type { Account } from "@/lib/types";
import type { DebriefResponse, DebriefResult, MatchCandidate } from "@/lib/schemas";

export type Sample = { id: string; label: string; mode: "speak" | "paste"; text: string };

type View =
  | { kind: "capture" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "demo"; message: string; matcher: MatchCandidate[] }
  | { kind: "result"; result: DebriefResult; mode: "demo" | "live"; removed: number; runId: number };

const STEPS = ["Capture", "Review", "Approve"] as const;

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
  const [view, setView] = useState<View>({ kind: "capture" });
  const [phase, setPhase] = useState<Phase>("review");
  const [runs, setRuns] = useState(0);

  const step = view.kind === "result" ? (phase === "approve" ? 2 : 1) : view.kind === "demo" ? 1 : 0;

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
        setPhase("review");
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

  function startOver() {
    setText("");
    setView({ kind: "capture" });
  }

  return (
    <Card className="mx-auto max-w-3xl p-5 sm:p-7">
      <Stepper step={step} />

      {(view.kind === "capture" || view.kind === "loading" || view.kind === "error") && (
        <div className="mt-6 space-y-4">
          <Segmented<"speak" | "paste">
            value={mode}
            onChange={setMode}
            options={[
              { value: "speak", label: "Speak a debrief" },
              { value: "paste", label: "Paste message / email" },
            ]}
          />
          <SpeechInput mode={mode} value={text} onChange={setText} />
          {view.kind === "error" && <p className="rounded-control bg-danger-bg px-3 py-2 text-sm text-danger-fg">{view.message}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => submit(text)} disabled={!text.trim() || view.kind === "loading"} className={btn.primary}>
              {view.kind === "loading" ? "Working…" : "Propose CRM update"}
            </button>
            {text && (
              <button onClick={startOver} className="text-sm text-muted hover:text-ink hover:underline">
                Clear
              </button>
            )}
          </div>
          <div className="border-t border-line pt-4">
            <div className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase">Try a sample</div>
            <div className="flex flex-wrap gap-2">
              {samples.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => pickSample(s)}
                  disabled={view.kind === "loading"}
                  className="rounded-full border border-line px-3 py-1 text-sm text-ink hover:border-tint-2 hover:bg-tint disabled:opacity-40"
                >
                  {i + 1}. {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {view.kind === "demo" && (
        <div className="mt-6 space-y-4">
          <div className="rounded-control bg-tint px-3 py-2 text-sm text-brand-dark">{view.message}</div>
          <div>
            <h3 className="text-sm font-semibold text-navy">Rule-based account matcher (no AI)</h3>
            {view.matcher.length === 0 ? (
              <p className="mt-1 text-sm text-muted">No CRM account matches this text — it may be a new lead.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {view.matcher.map((c) => (
                  <li key={c.lead_id} className="rounded-card border border-line p-3">
                    <Link href={`/accounts/${c.lead_id}`} className={btn.link}>
                      {c.company}
                    </Link>{" "}
                    <span className="text-muted">{c.lead_id}</span>
                    <span className="block text-xs text-muted">{c.reason}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="border-t border-line pt-4">
            <button onClick={() => setView({ kind: "capture" })} className={btn.secondary}>
              Back
            </button>
          </div>
        </div>
      )}

      {view.kind === "result" && (
        <div className="mt-6 space-y-4">
          <p className="text-xs text-muted">
            {view.mode === "demo" ? "Demo mode: this proposal was pre-generated with Claude during the build." : "Live AI proposal."} Nothing changes
            in the CRM until you approve it.
            {view.removed > 0 && ` ${view.removed} claim(s) were dropped because their quote was not found in the text.`}
          </p>
          <ProposalView
            key={view.runId}
            result={view.result}
            accounts={accounts}
            duplicatePairs={duplicatePairs}
            phase={phase}
            setPhase={setPhase}
            onBack={() => setView({ kind: "capture" })}
            onNew={startOver}
          />
        </div>
      )}
    </Card>
  );
}

function Stepper({ step }: { step: number }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Debrief steps">
      {STEPS.map((label, i) => {
        const done = i < step;
        const current = i === step;
        return (
          <li key={label} className="flex flex-1 items-center gap-2" aria-current={current ? "step" : undefined}>
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                done ? "bg-brand text-white" : current ? "bg-navy text-white" : "bg-dq-bg text-dq-fg"
              }`}
            >
              {done ? <Check size={14} /> : i + 1}
            </span>
            <span className={`text-sm ${current ? "font-semibold text-navy" : done ? "text-brand" : "text-muted"}`}>{label}</span>
            {i < STEPS.length - 1 && <span className={`mx-1 h-px flex-1 ${done ? "bg-brand" : "bg-line"}`} />}
          </li>
        );
      })}
    </ol>
  );
}
