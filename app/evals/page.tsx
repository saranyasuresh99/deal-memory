// Evals: measures the Radar against the editorial notes (the answer key). Runs on the server at build time;
// the answer key is read only here and is never part of any AI input.
import { ChartNoAxesColumn, ListChecks, Target } from "lucide-react";
import answerKey from "@/data/answer_key.json";
import radarJson from "@/data/radar.json";
import Badge from "@/components/Badge";
import PrecisionHelper from "@/components/PrecisionHelper";
import EvalsExport from "@/components/EvalsExport";
import { Card, KpiCard, PageHeader, th } from "@/components/ui";
import { accounts, documents } from "@/lib/data";
import { EXTRA_NOT_DONE_PATTERNS, NOT_DONE_PATTERNS, runEvals, type NoteCheck } from "@/lib/evals";
import { TYPE_META } from "@/lib/radar-meta";
import type { RadarFile, RadarType } from "@/lib/schemas";
import type { EditorialNote } from "@/lib/types";

const radar = radarJson as RadarFile;

function pct(n: number, d: number) {
  return d ? `${Math.round((n / d) * 100)}%` : "–";
}

export default function EvalsPage() {
  const key = answerKey as Record<string, EditorialNote[]>;
  const spec = runEvals(key, documents, accounts, radar.items);
  const broad = runEvals(key, documents, accounts, radar.items, [...NOT_DONE_PATTERNS, ...EXTRA_NOT_DONE_PATTERNS]);
  const specKeys = new Set(spec.checks.map((c) => c.file + c.note));
  const extra = broad.checks.filter((c) => !specKeys.has(c.file + c.note));
  const hits = (cs: NoteCheck[], strict = false) => cs.filter((c) => (strict ? c.strict_hit : c.hit)).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Evals"
        subtitle={
          <>
            The italic editorial notes in the emails and meeting notes — e.g. <em>(No reply sent as of 2026-07-10.)</em> — are the answer key:
            they were stripped before any AI or user-facing screen saw the data, and are used only here to score the Radar.
          </>
        }
      />
      <EvalsExport checks={broad.checks.map((c) => ({ ...c, in_spec_set: specKeys.has(c.file + c.note) }))} />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <KpiCard
          icon={Target}
          label="Recall (spec)"
          value={pct(hits(spec.checks), spec.checks.length)}
          sub={`${hits(spec.checks)} of ${spec.checks.length} "not done" notes have at least one Radar item for that account.`}
        />
        <KpiCard
          icon={ListChecks}
          label="Strict recall"
          value={pct(hits(spec.checks, true), spec.checks.length)}
          sub={`${hits(spec.checks, true)} of ${spec.checks.length} are caught by a specific leak, not only a stale / no-owner card.`}
        />
        <KpiCard
          icon={ChartNoAxesColumn}
          label="Broader check"
          value={pct(hits(broad.checks), broad.checks.length)}
          sub={`${hits(broad.checks)} of ${broad.checks.length} when other "not done" wordings are included (strict: ${hits(broad.checks, true)}).`}
        />
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-line px-4 py-3">
          <h2 className="text-base font-semibold text-navy">Notes that say something was not done</h2>
          <p className="text-xs text-muted">Matched by the spec&apos;s phrases: “No reply”, “not sent”, “never”, “No one”, “not started”, “not answered”.</p>
        </div>
        <NotesTable checks={spec.checks} />
        {extra.length > 0 && (
          <details className="border-t border-line">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-brand hover:bg-subtle">
              Broader check: {extra.length} more notes with other wordings (e.g. “No response”, “Nothing was sent”, “not arranged”)
            </summary>
            <NotesTable checks={extra} />
          </details>
        )}
      </Card>

      <PrecisionHelper items={radar.items} />
    </div>
  );
}

function NotesTable({ checks }: { checks: NoteCheck[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="border-b border-line bg-subtle">
          <tr>
            <th className={th}>Result</th>
            <th className={th}>Account</th>
            <th className={th}>Editorial note (answer key)</th>
            <th className={th}>Radar items for this account</th>
          </tr>
        </thead>
        <tbody>
          {checks.map((c) => (
            <tr key={c.file + c.note} className="border-t border-line align-top">
              <td className="px-4 py-3 whitespace-nowrap">
                {c.hit ? <Badge tone="rev">Hit</Badge> : <Badge tone="danger">Miss</Badge>}
                {c.hit && !c.strict_hit && <div className="mt-1 text-xs text-muted">generic only</div>}
              </td>
              <td className="px-4 py-3">
                <div className="font-medium text-ink">{c.account}</div>
                <div className="text-xs text-muted">{c.matched_by}</div>
              </td>
              <td className="px-4 py-3">
                <div className="text-ink italic">{c.note}</div>
                {c.context && <div className="mt-0.5 text-xs text-muted">on: {c.context}</div>}
                <div className="mt-0.5 text-xs text-muted">{c.file}</div>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {c.radar_types.length === 0 && <span className="text-xs text-muted">none</span>}
                  {c.radar_types.map((t) => (
                    <Badge key={t} tone={TYPE_META[t as RadarType].tone}>
                      {TYPE_META[t as RadarType].label}
                    </Badge>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
