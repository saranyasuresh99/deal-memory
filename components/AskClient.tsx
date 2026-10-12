"use client";

import { useState } from "react";
import CitedLines from "./CitedLines";
import DocPanel from "./DocPanel";
import { MessageCircle, Send } from "lucide-react";
import { Card, btn } from "./ui";
import { useRegisterExport } from "./shell/ExportContext";
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
      update({ status: "error", message: "Something went wrong — please try again." });
    }
  }

  useRegisterExport("ask-conversation.csv", () =>
    turns.flatMap((t) =>
      t.result
        ? t.result.points.length
          ? t.result.points.map((p) => ({ question: t.question, answer: t.result!.answer, point: p.text, sources: p.citations.map((c) => `${c.file}: "${c.quote}"`).join(" | ") }))
          : [{ question: t.question, answer: t.result.answer, point: "", sources: "" }]
        : [{ question: t.question, answer: t.message ?? "", point: "", sources: "" }],
    ),
  );

  const chips = (qs: string[], primary: boolean) => (
    <div className="flex flex-wrap gap-2">
      {qs.map((q) => (
        <button
          key={q}
          onClick={() => ask(q)}
          disabled={busy}
          className={`rounded-full border px-3 py-1 text-sm disabled:opacity-40 ${primary ? "border-tint-2 bg-tint text-brand-dark hover:border-brand" : "border-line text-ink hover:bg-subtle"}`}
        >
          {q}
        </button>
      ))}
    </div>
  );

  return (
    <Card className="mx-auto flex max-w-3xl flex-col">
      <div className="space-y-5 p-5 sm:p-6">
        {turns.length === 0 && (
          <div className="py-6 text-center">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-tint text-brand">
              <MessageCircle size={20} />
            </span>
            <p className="mt-3 text-sm text-muted">Ask about any client, deal or promise. Try one of these:</p>
            <div className="mt-3 flex justify-center">{chips(examples, true)}</div>
          </div>
        )}
        {turns.map((t, i) => (
          <div key={i} className="space-y-2">
            <div className="ml-auto w-fit max-w-[85%] rounded-card rounded-br-[4px] bg-brand px-3.5 py-2 text-sm text-white">{t.question}</div>
            <div className="max-w-full rounded-card rounded-bl-[4px] border border-line bg-surface p-4 text-sm sm:max-w-[92%]">
              {t.status === "loading" && <span className="text-muted">Looking through the CRM, emails and notes…</span>}
              {t.status === "error" && <span className="text-danger-fg">{t.message}</span>}
              {t.status === "demo" && <span className="text-brand-dark">{t.message}</span>}
              {t.status === "answer" && t.result && (
                <div className="space-y-3">
                  <p className={t.result.refused ? "text-muted italic" : "font-medium text-navy"}>{t.result.answer}</p>
                  {t.result.points.length > 0 && (
                    <CitedLines lines={t.result.points} canOpen={(f) => byId.has(f)} onOpen={(f, quote) => setOpen({ doc: byId.get(f)!, quote })} />
                  )}
                  <p className="text-xs text-muted">
                    {t.mode === "demo" ? "Pre-generated with Claude during the build." : "Answered live by Claude."}
                    {t.removed ? ` ${t.removed} unsupported claim(s) removed.` : ""}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3 border-t border-line p-4 sm:p-5">
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
            aria-label="Your question"
            className="min-w-0 flex-1 rounded-control border border-line px-3 py-2 text-sm placeholder:text-muted focus:border-brand focus:outline-none"
          />
          <button type="submit" disabled={!question.trim() || busy} className={btn.primary}>
            <Send size={16} />
            <span className="hidden sm:inline">Ask</span>
          </button>
        </form>
        {turns.length > 0 && chips(examples, true)}
        {more.length > 0 && (
          <details>
            <summary className="cursor-pointer text-xs text-muted">More demo questions ({more.length})</summary>
            <div className="mt-2">{chips(more, false)}</div>
          </details>
        )}
      </div>

      <DocPanel doc={open?.doc ?? null} highlight={open?.quote} onClose={() => setOpen(null)} />
    </Card>
  );
}
