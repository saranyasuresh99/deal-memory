// Pill (design/DESIGN.md §1). Tones map to the design tokens.
const TONES = {
  wait: "bg-wait-bg text-wait-fg", // waiting on us
  warn: "bg-warn-bg text-warn-fg", // deadlines, our promises, date warnings
  rev: "bg-rev-bg text-rev-fg", // hidden revenue, success
  dq: "bg-dq-bg text-dq-fg", // data quality, neutral
  brand: "bg-tint text-brand-dark",
  navy: "bg-navy text-white",
  danger: "bg-danger-bg text-danger-fg", // errors, eval misses
  // TEMPORARY aliases for pages not yet redesigned (removed at the end of the redesign)
  grey: "bg-dq-bg text-dq-fg",
  red: "bg-danger-bg text-danger-fg",
  orange: "bg-warn-bg text-warn-fg",
  amber: "bg-warn-bg text-warn-fg",
  green: "bg-rev-bg text-rev-fg",
  purple: "bg-rev-bg text-rev-fg",
  accent: "bg-tint text-brand-dark",
} as const;

export type Tone = keyof typeof TONES;

export default function Badge({ tone = "dq", children, title }: { tone?: Tone; children: React.ReactNode; title?: string }) {
  return (
    <span title={title} className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${TONES[tone]}`}>
      {children}
    </span>
  );
}
