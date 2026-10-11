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
          <div className="text-slate-800">{line.text}</div>
          {line.citations.map((c, j) => (
            <div key={j} className="mt-1 border-l-2 border-slate-200 pl-2 text-xs">
              <span className="text-slate-500 italic">“{c.quote}”</span>{" "}
              {canOpen(c.file) ? (
                <button onClick={() => onOpen(c.file, c.quote)} className="text-accent-600 hover:underline">
                  {c.file}
                </button>
              ) : (
                <span className="text-slate-400">{c.file === "crm_export.csv" ? "CRM record" : c.file}</span>
              )}
            </div>
          ))}
        </li>
      ))}
    </ul>
  );
}
