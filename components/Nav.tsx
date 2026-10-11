"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Pages are added here as each build phase lands.
const LINKS = [
  { href: "/", label: "Radar" },
  { href: "/debrief", label: "Debrief" },
  { href: "/promises", label: "Promises" },
  { href: "/accounts", label: "Accounts" },
  { href: "/ask", label: "Ask" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav className="flex w-full gap-1 overflow-x-auto sm:ml-auto sm:w-auto">
      {LINKS.map((l) => {
        const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap ${
              active ? "bg-accent-50 text-accent-700" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
