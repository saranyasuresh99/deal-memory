const TONES = {
  grey: "bg-slate-100 text-slate-700",
  red: "bg-red-50 text-red-700",
  orange: "bg-orange-50 text-orange-700",
  green: "bg-emerald-50 text-emerald-700",
  purple: "bg-purple-50 text-purple-700",
  accent: "bg-accent-50 text-accent-700",
  amber: "bg-amber-50 text-amber-800",
} as const;

export type Tone = keyof typeof TONES;

export default function Badge({ tone = "grey", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${TONES[tone]}`}>
      {children}
    </span>
  );
}
