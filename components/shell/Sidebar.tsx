"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Briefcase,
  ChartNoAxesColumn,
  Check,
  ChevronDown,
  List,
  MessageCircle,
  Mic,
  Radar,
  Search,
  SquareCheckBig,
  Users,
  type LucideIcon,
} from "lucide-react";
import { clearStore, useOwnerFilter, useStore } from "@/lib/store";
import { daysBetween } from "@/lib/accounts";
import { TODAY } from "@/lib/config";
import { Avatar } from "../ui";

export type ShellData = {
  live: boolean;
  quotes: { verified: number; total: number };
  radarIds: string[]; // every Radar item id
  overduePromiseIds: string[]; // Radar promises that count as overdue
  crmCount: number;
  recallPct: string; // e.g. "100%"
  accounts: { lead_id: string; company: string }[];
  owners: string[];
};

type NavItem = { href: string; label: string; icon: LucideIcon; badge?: string | number | null };

export default function Sidebar({ data, onNavigate }: { data: ShellData; onNavigate?: () => void }) {
  const store = useStore();
  const pathname = usePathname();

  const hidden = (id: string) => {
    const a = store.radar[id];
    return !!a && (a.status !== "snoozed" || (!!a.until && a.until > TODAY));
  };
  const radarActive = data.radarIds.filter((id) => !hidden(id)).length;
  const promisesOverdue =
    data.overduePromiseIds.filter((id) => store.radar[id]?.status !== "done").length +
    store.promises.filter((p) => p.status !== "done" && p.due_date && daysBetween(p.due_date, TODAY) > 0).length;

  const workspace: NavItem[] = [
    { href: "/", label: "Radar", icon: Radar, badge: radarActive },
    { href: "/debrief", label: "Debrief", icon: Mic },
    { href: "/promises", label: "Promises", icon: SquareCheckBig, badge: promisesOverdue },
    { href: "/accounts", label: "Accounts", icon: Briefcase, badge: data.crmCount + store.newLeads.length },
    { href: "/ask", label: "Ask", icon: MessageCircle },
  ];
  const quality: NavItem[] = [
    { href: "/evals", label: "Evals", icon: ChartNoAxesColumn, badge: data.recallPct },
    { href: "/audit", label: "Audit log", icon: List, badge: store.audit.length || null },
  ];

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <div className="flex h-full flex-col bg-sidebar px-4 py-5">
      <Link href="/" onClick={onNavigate} className="flex items-center gap-2.5 px-1">
        <span className="flex h-8 w-8 items-center justify-center rounded-control bg-brand text-sm font-semibold text-white">D</span>
        <span className="text-lg font-semibold text-navy">Deal Memory</span>
      </Link>

      <AccountSearch accounts={data.accounts} onNavigate={onNavigate} />

      <nav className="mt-5 space-y-5">
        <NavSection title="Workspace" items={workspace} isActive={isActive} onNavigate={onNavigate} />
        <NavSection title="Quality" items={quality} isActive={isActive} onNavigate={onNavigate} />
      </nav>

      <div className="mt-auto space-y-3 pt-6">
        <div className="rounded-card bg-tint p-3 text-xs leading-relaxed text-brand-dark">
          <div className="font-semibold text-navy">{data.live ? "Live AI" : "Demo mode"}</div>
          {data.live
            ? "AI features call Claude live. Every quote is checked against its source."
            : `AI results pre-generated with Claude. ${data.quotes.verified}/${data.quotes.total} quotes verified.`}
        </div>
        <UserCard owners={data.owners} />
      </div>
    </div>
  );
}

function NavSection({
  title,
  items,
  isActive,
  onNavigate,
}: {
  title: string;
  items: NavItem[];
  isActive: (href: string) => boolean;
  onNavigate?: () => void;
}) {
  return (
    <div>
      <div className="mb-1.5 px-2 text-[11px] font-semibold tracking-wider text-muted uppercase">{title}</div>
      <ul className="space-y-0.5">
        {items.map((it) => {
          const active = isActive(it.href);
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-control px-2 py-2 text-sm font-medium ${
                  active ? "bg-tint text-brand" : "text-ink hover:bg-subtle"
                }`}
              >
                <it.icon size={18} strokeWidth={2} className={active ? "text-brand" : "text-muted"} />
                <span className="flex-1">{it.label}</span>
                {it.badge !== undefined && it.badge !== null && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${active ? "bg-brand text-white" : "bg-dq-bg text-dq-fg"}`}
                  >
                    {it.badge}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// "Search accounts…" — filters by name; Enter or click jumps to the account page. Ctrl/⌘+K focuses it.
function AccountSearch({ accounts, onNavigate }: { accounts: ShellData["accounts"]; onNavigate?: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const matches = q.trim()
    ? accounts.filter((a) => a.company.toLowerCase().includes(q.trim().toLowerCase()) || a.lead_id.toLowerCase() === q.trim().toLowerCase()).slice(0, 6)
    : [];

  const go = (id: string) => {
    setQ("");
    setOpen(false);
    onNavigate?.();
    router.push(`/accounts/${id}`);
  };

  return (
    <div className="relative mt-5">
      <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && matches[0]) go(matches[0].lead_id);
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="Search accounts…"
        aria-label="Search accounts"
        className="w-full rounded-control border border-line bg-surface py-2 pr-10 pl-9 text-sm placeholder:text-muted focus:border-brand focus:outline-none"
      />
      <kbd className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[11px] text-muted">⌘K</kbd>
      {open && q.trim() && (
        <ul className="absolute z-30 mt-1 w-full overflow-hidden rounded-control border border-line bg-surface shadow-card">
          {matches.length === 0 && <li className="px-3 py-2 text-sm text-muted">No account found</li>}
          {matches.map((a) => (
            <li key={a.lead_id}>
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => go(a.lead_id)} className="flex w-full justify-between px-3 py-2 text-left text-sm hover:bg-subtle">
                <span>{a.company}</span>
                <span className="text-xs text-muted">{a.lead_id}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Roles from data/raw/README.md.
const ROLES: Record<string, string> = {
  Bhavin: "Founder",
  Dhaval: "Founder",
  Karandeep: "CEO",
  Jay: "Sales Executive",
  Pranav: "CTO",
  Ayush: "AI Product Manager",
};

// What the card shows for the current "View as" (= the app-wide owner filter, saved in localStorage).
function viewLabel(viewAs: string): { name: string; sub: string } {
  if (viewAs === "all") return { name: "Whole team", sub: "All owners" };
  if (viewAs === "none") return { name: "No owner", sub: "Unassigned items" };
  return { name: viewAs, sub: ROLES[viewAs] ?? "Team member" };
}

function ViewIcon({ viewAs, size }: { viewAs: string; size: number }) {
  if (viewAs === "all") {
    return (
      <span style={{ width: size, height: size }} className="inline-flex shrink-0 items-center justify-center rounded-full bg-tint text-brand">
        <Users size={size * 0.5} strokeWidth={2} />
      </span>
    );
  }
  return <Avatar name={viewAs === "none" ? null : viewAs} size={size} />;
}

// Shows the selected view (name, avatar, role) with the View as menu and Reset demo.
function UserCard({ owners }: { owners: string[] }) {
  const [open, setOpen] = useState(false);
  const [armed, setArmed] = useState(false);
  const [viewAs, setViewAs] = useOwnerFilter();
  const current = viewLabel(viewAs);
  // Menu order: Team, then people in the dataset README's order, then anyone else.
  const people = [...Object.keys(ROLES).filter((p) => owners.includes(p)), ...owners.filter((o) => !(o in ROLES))];
  const options = ["all", ...people, ...(viewAs !== "all" && !people.includes(viewAs) ? [viewAs] : [])];

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`View as: ${current.name}. Change view`}
        className="flex w-full items-center gap-3 rounded-card border border-line bg-surface p-2.5 text-left hover:bg-subtle"
      >
        <ViewIcon viewAs={viewAs} size={36} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-navy">{current.name}</span>
          <span className="block truncate text-xs text-muted">{current.sub}</span>
        </span>
        <ChevronDown size={16} className="text-muted" />
      </button>
      {open && (
        <div role="menu" className="absolute bottom-full z-30 mb-2 w-full rounded-card border border-line bg-surface p-2 shadow-card">
          <div className="px-2 pt-1 pb-1.5 text-[11px] font-semibold tracking-wider text-muted uppercase">View as</div>
          {options.map((o) => {
            const label = viewLabel(o);
            const selected = viewAs === o;
            return (
              <button
                key={o}
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => {
                  setViewAs(o);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 rounded-control px-2 py-1.5 text-left text-sm ${selected ? "bg-tint text-brand" : "text-ink hover:bg-subtle"}`}
              >
                <ViewIcon viewAs={o} size={24} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{label.name}</span>
                  <span className="block truncate text-xs text-muted">{label.sub}</span>
                </span>
                {selected && <Check size={16} className="shrink-0 text-brand" aria-hidden="true" />}
              </button>
            );
          })}
          <div className="my-2 border-t border-line" />
          <button
            onClick={() => {
              if (!armed) return setArmed(true);
              clearStore(); // also clears View as, so the card shows "Whole team" again
              window.location.reload();
            }}
            title="Clear all approvals, edits, new leads, promises, dismissals, eval marks and the View as setting saved in this browser"
            className={`block w-full rounded-control px-2 py-1.5 text-left text-sm font-medium ${armed ? "bg-danger-bg text-danger-fg" : "text-ink hover:bg-subtle"}`}
          >
            {armed ? "Click again to reset" : "Reset demo"}
          </button>
        </div>
      )}
    </div>
  );
}
