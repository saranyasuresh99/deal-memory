// Shared response for the read-only /api/export/*.csv routes (Power BI Web connector).
import { UTF8_BOM, toCsv, type CsvRow } from "./csv";

export function csvResponse(filename: string, rows: CsvRow[]): Response {
  return new Response(UTF8_BOM + toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}
