"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Download } from "lucide-react";
import { useExportSpec } from "./ExportContext";
import { btn } from "../ui";
import { downloadCsv } from "@/lib/csv";
import { useStore } from "@/lib/store";
import { AUDIT_COLUMNS, accountsTable, auditTable, promisesTable, radarTable } from "@/lib/powerbi";
import type { RadarFile } from "@/lib/schemas";
import type { Account } from "@/lib/types";

// Export menu in the top bar: the current list as CSV, or four Power BI tables (incl. approvals saved in this browser).
export default function ExportMenu() {
  const spec = useExportSpec();
  const store = useStore();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function exportPowerBi() {
    setBusy(true);
    try {
      // Loaded on demand so pages don't carry the full dataset.
      const [{ default: accounts }, { default: radar }] = await Promise.all([import("@/data/accounts.json"), import("@/data/radar.json")]);
      const items = (radar as RadarFile).items;
      const files: [string, () => void][] = [
        ["accounts.csv", () => downloadCsv("accounts.csv", accountsTable(accounts as Account[], store))],
        ["promises.csv", () => downloadCsv("promises.csv", promisesTable(items, store))],
        ["radar_items.csv", () => downloadCsv("radar_items.csv", radarTable(items, store))],
        ["audit_log.csv", () => downloadCsv("audit_log.csv", auditTable(store), AUDIT_COLUMNS)],
      ];
      // Small gaps between downloads; some browsers ask once to allow multiple files.
      for (const [, save] of files) {
        save();
        await new Promise((r) => setTimeout(r, 350));
      }
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open} className={btn.secondary}>
        <Download size={16} className="sm:hidden" />
        <span className="hidden sm:inline">Export</span>
        <ChevronDown size={14} className="hidden text-muted sm:inline" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-1 w-64 rounded-card border border-line bg-surface p-1.5 shadow-card">
          <button
            role="menuitem"
            disabled={!spec}
            onClick={() => {
              if (spec) downloadCsv(spec.filename, spec.rows());
              setOpen(false);
            }}
            className="block w-full rounded-control px-3 py-2 text-left hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className="block text-sm font-medium text-ink">This list (CSV)</span>
            <span className="block text-xs text-muted">{spec ? spec.filename : "Nothing to export on this page"}</span>
          </button>
          <button role="menuitem" disabled={busy} onClick={exportPowerBi} className="block w-full rounded-control px-3 py-2 text-left hover:bg-subtle disabled:opacity-40">
            <span className="block text-sm font-medium text-ink">{busy ? "Preparing…" : "For Power BI (4 files)"}</span>
            <span className="block text-xs text-muted">accounts, promises, radar_items, audit_log — joined on lead_id, incl. your approvals</span>
          </button>
        </div>
      )}
    </div>
  );
}
