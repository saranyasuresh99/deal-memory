"use client";

import { useEffect } from "react";
import type { DocumentRecord } from "@/lib/types";
import { formatDate } from "@/lib/format";

// Side panel that shows one email / meeting note (editorial notes already removed at build time).
// Wraps the first case-insensitive match of `highlight` in a <mark>.
function withHighlight(text: string, highlight?: string) {
  if (!highlight) return text;
  const i = text.toLowerCase().indexOf(highlight.toLowerCase());
  if (i === -1) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark id="doc-highlight" className="rounded bg-yellow-200 px-0.5">{text.slice(i, i + highlight.length)}</mark>
      {text.slice(i + highlight.length)}
    </>
  );
}

export default function DocPanel({
  doc,
  onClose,
  highlight,
}: {
  doc: DocumentRecord | null;
  onClose: () => void;
  highlight?: string;
}) {
  useEffect(() => {
    if (!doc) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doc, onClose]);

  useEffect(() => {
    if (doc && highlight) document.getElementById("doc-highlight")?.scrollIntoView({ block: "center" });
  }, [doc, highlight]);

  if (!doc) return null;
  return (
    <div className="fixed inset-0 z-30 flex justify-end">
      <button aria-label="Close" className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wide text-slate-500">
              {doc.type === "email" ? "Email" : "Meeting note"} · {formatDate(doc.date)}
            </div>
            <div className="mt-0.5 font-medium">{doc.title}</div>
            <div className="mt-0.5 truncate text-xs text-slate-400">{doc.id}</div>
          </div>
          <button onClick={onClose} className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100">
            ✕
          </button>
        </div>
        <pre className="flex-1 overflow-y-auto p-4 font-sans text-sm leading-relaxed whitespace-pre-wrap text-slate-800">
          {withHighlight(doc.text, highlight)}
        </pre>
      </aside>
    </div>
  );
}
