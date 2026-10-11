"use client";

import { useState } from "react";
import CitedLines from "./CitedLines";
import DocPanel from "./DocPanel";
import type { AskResponse, AskResult } from "@/lib/schemas";
import type { DocumentRecord } from "@/lib/types";

type Turn = {
  question: string;
  status: "loading" | "answer" | "demo" | "error";
  result?: AskResult;
  mode?: "demo" | "live";
  removed?: number;
  message?: string;
};

export default function AskClient({
  examples,
  more,
  docs,
}: {
  examples: string[];
  more: string[];
  docs: DocumentRecord[];
}) {
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [open, setOpen] = useState<{ doc: DocumentRecord; quote: string } | null>(null);
  const byId = new Map(docs.map((d) => [d.id, d]));
  const busy = turns.some((t) => t.status === "loading");

  async function ask(q: string) {
    const text = q.trim();
    if (!text || busy) return;
    setQuestion("");
    const idx = turns.length;
    setTurns((t) => [...t, { question: text, status: "loading" }]);
    const update = (patch: Partial<Turn>) => setTurns((t) => t.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });
      const data = (await res.json()) as AskResponse;
      if ("error" in data) update({ status: "error", message: data.error });
      else if ("result" in data) update({ status: "answer", result: data.result, mode: data.mode, removed: data.removed_claims });
      else update({ status: "demo", message: data.message });
    } catch {
      update({ status: "error", message: "Could not reach the server. Please try again." });
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-4">
        {turns.map((t, i) => (
          <div key={i} className="space-y-2">
            <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-accent-600 px-3 py-2 text-sm text-white">{t.question}</div>
            <div className="max-w-full rounded-2xl rounded-bl-sm border border-slate-200 bg-white p-3 text-sm shadow-sm sm:max-w-[85%]">
              {t.status === "loading" && <span className="text-slate-400">Looking through the CRM, emails and notes…</span>}
              {t.status === "error" && <span className="text-red-700">{t.message}</span>}
              {t.status === "demo" && <span className="text-slate-600">{t.message}</span>}
              {t.status === "answer" && t.result && (
                <div className="space-y-3">
                  <p className={t.result.refused ? "text-slate-600 italic" : "text-slate-900"}>{t.result.answer}</p>
                  {t.result.points.length > 0 && (
                    <CitedLines lines={t.result.points} canOpen={(f) => byId.has(f)} onOpen={(f, quote) => setOpen({ doc: byId.get(f)!, quote })} />
                  )}
                  <p className="text-xs text-slate-400">
                    {t.mode === "demo" ? "Pre-generated with Claude during the build." : "Answered live by Claude."}
                    {t.removed ? ` ${t.removed} unsupported claim(s) removed.` : ""}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
        className="flex gap-2"
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about any client, deal or promise…"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-accent-600 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!question.trim() || busy}
          className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-40"
        >
          Ask
        </button>
      </form>

      <div>
        <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">Try</div>
        <div className="flex flex-wrap gap-2">
          {examples.map((q) => (
            <button key={q} onClick={() => ask(q)} disabled={busy} className="rounded-full border border-accent-600 bg-accent-50 px-3 py-1 text-sm text-accent-700 hover:bg-accent-100 disabled:opacity-40">
              {q}
            </button>
          ))}
        </div>
        {more.length > 0 && (
          <details className="mt-3">
            <summary className="cursor-pointer text-xs text-slate-500">More demo questions ({more.length})</summary>
            <div className="mt-2 flex flex-wrap gap-2">
              {more.map((q) => (
                <button key={q} onClick={() => ask(q)} disabled={busy} className="rounded-full border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40">
                  {q}
                </button>
              ))}
            </div>
          </details>
        )}
      </div>

      <DocPanel doc={open?.doc ?? null} highlight={open?.quote} onClose={() => setOpen(null)} />
    </div>
  );
}
