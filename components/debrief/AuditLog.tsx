"use client";

import { useStore, type FieldValue } from "@/lib/store";
import { formatDate } from "@/lib/format";

export function showValue(v: FieldValue | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  return typeof v === "number" ? "$" + v.toLocaleString("en-US") : v;
}

export default function AuditLog() {
  const { audit } = useStore();
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Audit log ({audit.length})</h2>
      {audit.length === 0 ? (
        <p className="text-sm text-slate-500">No approved changes yet. Every approved field will be listed here.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2">Who</th>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Account</th>
                <th className="px-3 py-2">Field</th>
                <th className="px-3 py-2">Before</th>
                <th className="px-3 py-2">After</th>
                <th className="px-3 py-2">Source quote</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...audit].reverse().map((e, i) => (
                <tr key={i} className="align-top">
                  <td className="px-3 py-2 whitespace-nowrap">{e.who}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatDate(e.when)}</td>
                  <td className="px-3 py-2">
                    {e.account} <span className="text-xs text-slate-400">{e.lead_id}</span>
                  </td>
                  <td className="px-3 py-2">
                    {e.field}
                    {e.edited && <span className="ml-1 text-xs text-amber-700">(edited)</span>}
                  </td>
                  <td className="px-3 py-2 text-slate-500">{showValue(e.before)}</td>
                  <td className="px-3 py-2">{showValue(e.after)}</td>
                  <td className="px-3 py-2 text-slate-600 italic">“{e.quote}”</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
