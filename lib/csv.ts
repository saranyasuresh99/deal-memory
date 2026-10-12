// CSV for the top-bar Export menu and the /api/export routes. Downloads happen in the browser; nothing is sent anywhere.
export type CsvRow = Record<string, string | number | null | undefined>;

function cell(v: string | number | null | undefined): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// `headers` is used when there are no rows (so the file still has its columns) or to fix the column order.
export function toCsv(rows: CsvRow[], headers?: string[]): string {
  const cols = headers ?? [...new Set(rows.flatMap((r) => Object.keys(r)))];
  if (cols.length === 0) return "";
  return [cols.map(cell).join(","), ...rows.map((r) => cols.map((h) => cell(r[h])).join(","))].join("\r\n") + "\r\n";
}

// UTF-8 with a byte-order mark, so Excel and Power BI detect the encoding (names like "Dr. Lisa Wong — …").
export const UTF8_BOM = "﻿";

export function downloadCsv(filename: string, rows: CsvRow[], headers?: string[]): void {
  const blob = new Blob([UTF8_BOM + toCsv(rows, headers)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
