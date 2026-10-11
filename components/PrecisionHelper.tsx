"use client";

import Link from "next/link";
import { useState } from "react";
import Badge from "./Badge";
import { updateStore, useStore } from "@/lib/store";
import { TYPE_META } from "@/lib/radar-meta";
import type { RadarItem } from "@/lib/schemas";

const TOP_N = 10;

// A person judges each Radar item Correct or Wrong; precision = correct / judged. Saved in this browser.
export default function PrecisionHelper({ items }: { items: RadarItem[] }) {
  const { evalMarks } = useStore();
  const [showAll, setShowAll] = useState(false);
  const correct = items.filter((i) => evalMarks[i.id] === "correct").length;
  const wrong = items.filter((i) => evalMarks[i.id] === "wrong").length;
  const judged = correct + wrong;
  const shown = showAll ? items : items.slice(0, TOP_N);

  const mark = (id: string, v: "correct" | "wrong") =>
    updateStore((s) => {
      const evalMarks = { ...s.evalMarks };
      if (evalMarks[id] === v) delete evalMarks[id];
      else evalMarks[id] = v;
      return { ...s, evalMarks };
    });

  return (
    <section>
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">Precision helper</h2>
      <p className="mb-3 text-sm text-slate-600">
        Read each Radar item and mark it <b>Correct</b> (a real leak worth acting on) or <b>Wrong</b>.{" "}
        {judged > 0 ? (
          <>
            Precision: <b className="text-accent-700">{Math.round((correct / judged) * 100)}%</b> ({correct} correct of {judged} judged,{" "}
            {items.length - judged} not judged yet).
          </>
        ) : (
          "Precision appears once you judge at least one item."
        )}
      </p>
      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 shadow-sm">
        {shown.map((i, idx) => (
          <li key={i.id} className="flex flex-wrap items-center gap-2 p-3 text-sm">
            <span className="w-7 text-xs text-slate-400">#{idx + 1}</span>
            <Badge tone={TYPE_META[i.type].tone}>{TYPE_META[i.type].label}</Badge>
            {i.lead_ids.length === 1 ? (
              <Link href={`/accounts/${i.lead_ids[0]}`} className="font-medium hover:underline">
                {i.account}
              </Link>
            ) : (
              <span className="font-medium">{i.account}</span>
            )}
            <span className="min-w-0 basis-full text-slate-600 sm:basis-auto sm:flex-1">{i.summary}</span>
            <div className="ml-auto flex gap-1">
              <button
                onClick={() => mark(i.id, "correct")}
                className={`rounded-md px-2 py-1 text-xs font-medium ${evalMarks[i.id] === "correct" ? "bg-emerald-600 text-white" : "border border-slate-300 hover:bg-slate-50"}`}
              >
                Correct
              </button>
              <button
                onClick={() => mark(i.id, "wrong")}
                className={`rounded-md px-2 py-1 text-xs font-medium ${evalMarks[i.id] === "wrong" ? "bg-red-600 text-white" : "border border-slate-300 hover:bg-slate-50"}`}
              >
                Wrong
              </button>
            </div>
          </li>
        ))}
      </ul>
      {items.length > TOP_N && (
        <div className="mt-3 text-center">
          <button onClick={() => setShowAll(!showAll)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
            {showAll ? `Show top ${TOP_N} only` : `Show all (${items.length})`}
          </button>
        </div>
      )}
    </section>
  );
}
