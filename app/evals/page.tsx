// Evals: measures the Radar against the editorial notes (the answer key). Runs on the server at build time;
// the answer key is read only here and is never part of any AI input.
import answerKey from "@/data/answer_key.json";
import radarJson from "@/data/radar.json";
import Badge from "@/components/Badge";
import PrecisionHelper from "@/components/PrecisionHelper";
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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Evals</h1>
        <p className="mt-1 text-sm text-slate-600">
          The italic editorial notes in the emails and meeting notes — e.g. <em>(No reply sent as of 2026-07-10.)</em> — are the
          answer key: they were stripped before any AI or user-facing screen saw the data, and are used only here to score the
          Radar.
        </p>
      </div>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat
          big={pct(hits(spec.checks), spec.checks.length)}
          label="Recall (spec)"
          sub={`${hits(spec.checks)} of ${spec.checks.length} "not done" notes have at least one Radar item for that account.`}
        />
        <Stat
          big={pct(hits(spec.checks, true), spec.checks.length)}
          label="Strict recall"
          sub={`${hits(spec.checks, true)} of ${spec.checks.length} are caught by a specific leak, not only a stale / no-owner card.`}
        />
        <Stat
          big={pct(hits(broad.checks), broad.checks.length)}
          label="Broader check"
          sub={`${hits(broad.checks)} of ${broad.checks.length} when other "not done" wordings are included (strict: ${hits(broad.checks, true)}).`}
        />
      </section>

      <section>
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">Notes that say something was not done</h2>
        <p className="mb-2 text-xs text-slate-500">
          Matched by the spec&apos;s phrases: “No reply”, “not sent”, “never”, “No one”, “not started”, “not answered”.
        </p>
        <NotesTable checks={spec.checks} />
        {extra.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-slate-600">
              Broader check: {extra.length} more notes with other wordings (e.g. “No response”, “Nothing was sent”, “not arranged”)
            </summary>
            <div className="mt-2">
              <NotesTable checks={extra} />
            </div>
          </details>
        )}
      </section>

      <PrecisionHelper items={radar.items} />
    </div>
  );
}

function Stat({ big, label, sub }: { big: string; label: string; sub: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="text-3xl font-semibold text-accent-700">{big}</div>
      <div className="text-sm font-medium text-slate-800">{label}</div>
      <div className="mt-1 text-xs text-slate-500">{sub}</div>
    </div>
  );
}

function NotesTable({ checks }: { checks: NoteCheck[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-slate-50 text-xs text-slate-500">
          <tr>
            <th className="px-3 py-2">Result</th>
            <th className="px-3 py-2">Account</th>
            <th className="px-3 py-2">Editorial note (answer key)</th>
            <th className="px-3 py-2">Radar items for this account</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {checks.map((c) => (
            <tr key={c.file + c.note} className="align-top">
              <td className="px-3 py-2 whitespace-nowrap">
                {c.hit ? <Badge tone="green">Hit</Badge> : <Badge tone="red">Miss</Badge>}
                {c.hit && !c.strict_hit && <div className="mt-1 text-xs text-slate-500">generic only</div>}
              </td>
              <td className="px-3 py-2">
                <div className="font-medium">{c.account}</div>
                <div className="text-xs text-slate-400">{c.matched_by}</div>
              </td>
              <td className="px-3 py-2">
                <div className="text-slate-700 italic">{c.note}</div>
                {c.context && <div className="mt-0.5 text-xs text-slate-500">on: {c.context}</div>}
                <div className="mt-0.5 text-xs text-slate-400">{c.file}</div>
              </td>
              <td className="px-3 py-2">
                <div className="flex flex-wrap gap-1">
                  {c.radar_types.length === 0 && <span className="text-xs text-slate-400">none</span>}
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
