// Pill (design/DESIGN.md §1). Tones map to the design tokens.
const TONES = {
  wait: "bg-wait-bg text-wait-fg", // waiting on us
  warn: "bg-warn-bg text-warn-fg", // deadlines, our promises, date warnings
  rev: "bg-rev-bg text-rev-fg", // hidden revenue, success
  dq: "bg-dq-bg text-dq-fg", // data quality, neutral
  brand: "bg-tint text-brand-dark",
  navy: "bg-navy text-white",
  danger: "bg-danger-bg text-danger-fg", // errors, eval misses
} as const;

export type Tone = keyof typeof TONES;

export default function Badge({ tone = "dq", children, title }: { tone?: Tone; children: React.ReactNode; title?: string }) {
  return (
    <span title={title} className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${TONES[tone]}`}>
      {children}
    </span>
  );
}
