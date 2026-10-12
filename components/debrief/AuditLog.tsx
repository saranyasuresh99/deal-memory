"use client";

import Link from "next/link";
import { useStore, type FieldValue } from "@/lib/store";
import { formatDate } from "@/lib/format";
import { Card, btn, th } from "../ui";
import { useRegisterExport } from "../shell/ExportContext";

export function showValue(v: FieldValue | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  return typeof v === "number" ? "$" + v.toLocaleString("en-US") : v;
}

// Every CRM change approved in Debrief (who, when, field, before, after, source quote). Newest first.
export default function AuditLog() {
  const { audit } = useStore();

  useRegisterExport("audit-log.csv", () =>
    [...audit].reverse().map((e) => ({
      who: e.who,
      when: e.when,
      lead_id: e.lead_id,
      account: e.account,
      field: e.field,
      before: showValue(e.before),
      after: showValue(e.after),
      edited: e.edited ? "yes" : "no",
      source_quote: e.quote,
    })),
  );

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
        <h2 className="text-base font-semibold text-navy">Approved changes</h2>
        <span className="text-sm text-muted">{audit.length} in this browser</span>
      </div>
      {audit.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-muted">
          No approved changes yet. Every field you approve in Debrief is listed here.{" "}
          <Link href="/debrief" className={btn.link}>
            Start a debrief
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-b border-line bg-subtle">
              <tr>
                <th className={th}>Who</th>
                <th className={th}>When</th>
                <th className={th}>Account</th>
                <th className={th}>Field</th>
                <th className={th}>Before</th>
                <th className={th}>After</th>
                <th className={th}>Source quote</th>
              </tr>
            </thead>
            <tbody>
              {[...audit].reverse().map((e, i) => (
                <tr key={i} className="border-t border-line align-top">
                  <td className="px-4 py-3 whitespace-nowrap text-ink">{e.who}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-ink">{formatDate(e.when)}</td>
                  <td className="px-4 py-3">
                    {e.lead_id.startsWith("NEW-") ? (
                      <span className="font-medium text-ink">{e.account}</span>
                    ) : (
                      <Link href={`/accounts/${e.lead_id}`} className="font-medium text-ink hover:text-brand">
                        {e.account}
                      </Link>
                    )}
                    <div className="text-xs text-muted">{e.lead_id}</div>
                  </td>
                  <td className="px-4 py-3 text-ink">
                    {e.field}
                    {e.edited && <span className="ml-1 text-xs text-warn-fg">(edited)</span>}
                  </td>
                  <td className="px-4 py-3 text-muted">{showValue(e.before)}</td>
                  <td className="px-4 py-3 font-medium text-navy">{showValue(e.after)}</td>
                  <td className="max-w-[320px] px-4 py-3 text-xs text-muted">“{e.quote}”</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
