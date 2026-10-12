// Shared building blocks for the redesigned UI (design/DESIGN.md). Server- and client-safe (no hooks).
import type { LucideIcon } from "lucide-react";

export const btn = {
  primary:
    "inline-flex items-center justify-center gap-1.5 rounded-control bg-brand px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-40",
  secondary:
    "inline-flex items-center justify-center gap-1.5 rounded-control border border-line bg-surface px-3.5 py-2 text-sm font-medium text-ink hover:bg-subtle disabled:opacity-40",
  small:
    "inline-flex items-center justify-center gap-1 rounded-control border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink hover:bg-subtle disabled:opacity-40",
  smallPrimary:
    "inline-flex items-center justify-center gap-1 rounded-control bg-brand px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-dark disabled:opacity-40",
  link: "font-medium text-brand hover:text-brand-dark hover:underline",
};

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-card border border-line bg-surface shadow-card ${className}`}>{children}</div>;
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: React.ReactNode }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-navy sm:text-[28px]">{title}</h1>
      {subtitle && <div className="mt-1 text-sm text-muted">{subtitle}</div>}
    </div>
  );
}

export function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  const body = (
    <>
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-tint text-brand">
        <Icon size={18} strokeWidth={2} />
      </span>
      <div className="mt-3 text-sm text-muted">{label}</div>
      <div className="mt-0.5 text-2xl font-semibold text-navy sm:text-[28px]">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted sm:text-sm">{sub}</div>}
    </>
  );
  const cls = `rounded-card border bg-surface p-4 text-left shadow-card ${active ? "border-brand ring-1 ring-brand" : "border-line"}`;
  return onClick ? (
    <button onClick={onClick} aria-pressed={active} className={`${cls} hover:border-tint-2`}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}

const AVATAR_COLOURS: Record<string, string> = {
  Bhavin: "bg-brand text-white",
  Dhaval: "bg-navy text-white",
  Karandeep: "bg-brand-dark text-white",
  Jay: "bg-[#5b8fd0] text-white",
};

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2)).toUpperCase();
}

export function Avatar({ name, size = 28 }: { name: string | null; size?: number }) {
  const style = { width: size, height: size, fontSize: size * 0.36 };
  if (!name) {
    return (
      <span title="No owner" style={style} className="inline-flex shrink-0 items-center justify-center rounded-full bg-dq-bg font-semibold text-dq-fg">
        –
      </span>
    );
  }
  return (
    <span title={name} style={style} className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${AVATAR_COLOURS[name] ?? "bg-tint text-brand-dark"}`}>
      {initials(name)}
    </span>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div role="tablist" className="inline-flex rounded-control border border-line p-0.5 text-sm">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-[6px] px-3 py-1 font-medium ${value === o.value ? "bg-navy text-white" : "text-muted hover:text-ink"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// "Owner: All ▾" style dropdown (a real <select>, styled as a pill button).
export function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const current = options.find((o) => o.value === value)?.label ?? value;
  return (
    <label className="relative inline-flex items-center rounded-control border border-line bg-surface px-3 py-1.5 text-sm text-ink hover:bg-subtle">
      <span className="whitespace-nowrap">
        {label}: {current} ▾
      </span>
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function MiniStat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="rounded-control bg-subtle px-3 py-2.5">
      <div className="text-sm font-semibold text-navy">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}

export function GroupHeader({ dot, title, count }: { dot: string; title: string; count: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-4 pt-4 pb-2">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      <span className="text-sm font-semibold text-navy">{title}</span>
      <span className="text-sm text-muted">{count}</span>
    </div>
  );
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <h2 className="text-sm font-semibold text-navy">{children}</h2>
      {right}
    </div>
  );
}

// Table header cell / body cell classes for the shared table style.
export const th = "px-4 py-2.5 text-left text-[11px] font-semibold tracking-wider text-muted uppercase";
export const td = "px-4 py-3 align-top";
