"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
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
      <mark id="doc-highlight" className="rounded bg-warn-bg px-0.5 text-ink ring-1 ring-[#f2cf7a]">{text.slice(i, i + highlight.length)}</mark>
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
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={doc.title}>
      <button aria-label="Close document" className="absolute inset-0 bg-navy/30" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-xl flex-col bg-surface shadow-card">
        <div className="flex items-start justify-between gap-3 border-b border-line p-5">
          <div className="min-w-0">
            <div className="text-xs font-medium tracking-wider text-muted uppercase">
              {doc.type === "email" ? "Email" : "Meeting note"} · {formatDate(doc.date)}
            </div>
            <div className="mt-1 font-semibold text-navy">{doc.title}</div>
            <div className="mt-0.5 truncate text-xs text-muted">{doc.id}</div>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-control p-1.5 text-muted hover:bg-subtle">
            <X size={18} />
          </button>
        </div>
        <pre className="flex-1 overflow-y-auto p-5 font-sans text-sm leading-relaxed whitespace-pre-wrap text-ink">
          {withHighlight(doc.text, highlight)}
        </pre>
      </aside>
    </div>
  );
}
