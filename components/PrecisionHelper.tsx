"use client";

import Link from "next/link";
import { useState } from "react";
import Badge from "./Badge";
import { Card, th } from "./ui";
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
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line px-4 py-3">
        <h2 className="text-base font-semibold text-navy">Precision helper</h2>
        <span className="text-sm text-muted">
          {judged > 0 ? (
            <>
              Precision <b className="text-navy">{Math.round((correct / judged) * 100)}%</b> · {correct} correct of {judged} judged ·{" "}
              {items.length - judged} not judged
            </>
          ) : (
            "Mark each Radar item Correct (a real leak worth acting on) or Wrong. Precision appears once you judge one."
          )}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-line bg-subtle">
            <tr>
              <th className={`${th} w-12`}>#</th>
              <th className={th}>Leak</th>
              <th className={th}>Account</th>
              <th className={th}>Summary</th>
              <th className={`${th} text-right`}>Judgement</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((i, idx) => (
              <tr key={i.id} className="border-t border-line align-top">
                <td className="px-4 py-3 text-xs text-muted">{idx + 1}</td>
                <td className="px-4 py-3">
                  <Badge tone={TYPE_META[i.type].tone}>{TYPE_META[i.type].label}</Badge>
                </td>
                <td className="px-4 py-3 font-medium">
                  {i.lead_ids.length === 1 ? (
                    <Link href={`/accounts/${i.lead_ids[0]}`} className="text-ink hover:text-brand">
                      {i.account}
                    </Link>
                  ) : (
                    <span className="text-ink">{i.account}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted">{i.summary}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1.5">
                    <button
                      onClick={() => mark(i.id, "correct")}
                      aria-pressed={evalMarks[i.id] === "correct"}
                      className={`rounded-control px-2.5 py-1 text-xs font-medium ${evalMarks[i.id] === "correct" ? "bg-rev-fg text-white" : "border border-line text-ink hover:bg-subtle"}`}
                    >
                      Correct
                    </button>
                    <button
                      onClick={() => mark(i.id, "wrong")}
                      aria-pressed={evalMarks[i.id] === "wrong"}
                      className={`rounded-control px-2.5 py-1 text-xs font-medium ${evalMarks[i.id] === "wrong" ? "bg-danger-fg text-white" : "border border-line text-ink hover:bg-subtle"}`}
                    >
                      Wrong
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {items.length > TOP_N && (
        <div className="border-t border-line px-4 py-2.5">
          <button onClick={() => setShowAll(!showAll)} className="text-sm font-medium text-brand hover:underline">
            {showAll ? `Show top ${TOP_N} only` : `Show all (${items.length})`}
          </button>
        </div>
      )}
    </Card>
  );
}
