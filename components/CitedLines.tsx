"use client";

import type { CitedLine } from "@/lib/schemas";

// A list of AI lines, each followed by its verified source(s). Clicking a file name calls onOpen.
export default function CitedLines({
  lines,
  onOpen,
  canOpen,
}: {
  lines: CitedLine[];
  onOpen: (file: string, quote: string) => void;
  canOpen: (file: string) => boolean;
}) {
  return (
    <ul className="space-y-3">
      {lines.map((line, i) => (
        <li key={i} className="text-sm">
          <div className="text-ink">{line.text}</div>
          {line.citations.map((c, j) => (
            <div key={j} className="mt-1.5 rounded-control bg-subtle px-3 py-2 text-xs">
              <span className="text-ink">“{c.quote}”</span>{" "}
              {canOpen(c.file) ? (
                <button onClick={() => onOpen(c.file, c.quote)} className="font-medium text-brand hover:text-brand-dark hover:underline">
                  {c.file}
                </button>
              ) : (
                <span className="text-muted">{c.file === "crm_export.csv" ? "CRM record" : c.file}</span>
              )}
            </div>
          ))}
        </li>
      ))}
    </ul>
  );
}
