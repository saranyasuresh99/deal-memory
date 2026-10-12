"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Download, Menu, Plus, X } from "lucide-react";
import Sidebar, { type ShellData } from "./Sidebar";
import { ExportProvider, useExportSpec } from "./ExportContext";
import { downloadCsv } from "@/lib/csv";
import { btn } from "../ui";

function crumb(pathname: string): [string, string] {
  if (pathname === "/") return ["Workspace", "Revenue Leak Radar"];
  if (pathname.startsWith("/debrief")) return ["Workspace", "Debrief"];
  if (pathname.startsWith("/promises")) return ["Workspace", "Promise Ledger"];
  if (/^\/accounts\/.+/.test(pathname)) return ["Workspace / Accounts", pathname.split("/")[2]];
  if (pathname.startsWith("/accounts")) return ["Workspace", "Accounts"];
  if (pathname.startsWith("/ask")) return ["Workspace", "Ask"];
  if (pathname.startsWith("/evals")) return ["Quality", "Evals"];
  if (pathname.startsWith("/audit")) return ["Quality", "Audit log"];
  return ["Workspace", ""];
}

export default function AppShell({ data, todayLabel, children }: { data: ShellData; todayLabel: string; children: React.ReactNode }) {
  return (
    <ExportProvider>
      <ShellInner data={data} todayLabel={todayLabel}>
        {children}
      </ShellInner>
    </ExportProvider>
  );
}

function ShellInner({ data, todayLabel, children }: { data: ShellData; todayLabel: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);
  const [section, page] = crumb(pathname);

  // Close the drawer on navigation and with Escape.
  useEffect(() => setDrawer(false), [pathname]);
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawer]);

  return (
    <div className="min-h-screen shell:p-5">
      <div className="mx-auto flex min-h-screen max-w-[1480px] bg-surface shell:min-h-[calc(100vh-40px)] shell:overflow-hidden shell:rounded-shell shell:border shell:border-line">
        {/* Sidebar: fixed column on wide screens */}
        <aside className="hidden w-[236px] shrink-0 border-r border-line shell:block">
          <div className="sticky top-0 h-screen shell:h-[calc(100vh-40px)]">
            <Sidebar data={data} />
          </div>
        </aside>

        {/* Sidebar: slide-in drawer below 900px */}
        {drawer && (
          <div className="fixed inset-0 z-40 shell:hidden" role="dialog" aria-modal="true" aria-label="Menu">
            <button aria-label="Close menu" className="absolute inset-0 bg-navy/30" onClick={() => setDrawer(false)} />
            <div className="relative h-full w-[272px] max-w-[85vw] overflow-y-auto border-r border-line">
              <button aria-label="Close menu" onClick={() => setDrawer(false)} className="absolute top-4 right-3 z-10 rounded-control p-1 text-muted hover:bg-subtle">
                <X size={18} />
              </button>
              <Sidebar data={data} onNavigate={() => setDrawer(false)} />
            </div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar section={section} page={page} todayLabel={todayLabel} onMenu={() => setDrawer(true)} />
          <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 shell:px-8">{children}</main>
          <footer className="px-4 pb-6 text-xs text-muted sm:px-6 shell:px-8">
            Prototype with synthetic data. Nothing is ever sent to a client, and no CRM change happens without your approval.
          </footer>
        </div>
      </div>
    </div>
  );
}

function TopBar({ section, page, todayLabel, onMenu }: { section: string; page: string; todayLabel: string; onMenu: () => void }) {
  const spec = useExportSpec();
  return (
    <header className="sticky top-0 z-20 flex min-h-[62px] flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-surface/95 px-4 py-2.5 backdrop-blur sm:px-6 shell:px-8">
      <button onClick={onMenu} aria-label="Open menu" className="-ml-1 rounded-control p-1.5 text-ink hover:bg-subtle shell:hidden">
        <Menu size={20} />
      </button>
      <div className="min-w-0 flex-1 truncate text-sm">
        <span className="text-muted">{section} / </span>
        <span className="font-medium text-navy">{page}</span>
      </div>
      <span className="hidden rounded-full border border-line px-3 py-1.5 text-sm text-muted sm:inline">Today: {todayLabel}</span>
      <button
        onClick={() => spec && downloadCsv(spec.filename, spec.rows())}
        disabled={!spec}
        title={spec ? `Download ${spec.filename}` : "Nothing to export on this page"}
        className={btn.secondary}
      >
        <Download size={16} className="sm:hidden" />
        <span className="hidden sm:inline">Export</span>
      </button>
      <Link href="/debrief" className={btn.primary}>
        <Plus size={16} />
        <span className="hidden sm:inline">New debrief</span>
      </Link>
    </header>
  );
}
