"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { CsvRow } from "@/lib/csv";

export type ExportSpec = { filename: string; rows: () => CsvRow[] };

const Ctx = createContext<{ spec: ExportSpec | null; setSpec: (s: ExportSpec | null) => void }>({
  spec: null,
  setSpec: () => {},
});

export function ExportProvider({ children }: { children: React.ReactNode }) {
  const [spec, setSpec] = useState<ExportSpec | null>(null);
  return <Ctx.Provider value={{ spec, setSpec }}>{children}</Ctx.Provider>;
}

export function useExportSpec(): ExportSpec | null {
  return useContext(Ctx).spec;
}

// A page calls this to say what "Export" should download. `rows` is read at click time, so it always
// reflects the current filters. The registration is removed when the page unmounts.
export function useRegisterExport(filename: string, rows: () => CsvRow[]): void {
  const { setSpec } = useContext(Ctx);
  const rowsRef = useRef(rows);
  useEffect(() => {
    rowsRef.current = rows;
  });
  useEffect(() => {
    setSpec({ filename, rows: () => rowsRef.current() });
    return () => setSpec(null);
  }, [filename, setSpec]);
}
