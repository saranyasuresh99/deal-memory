// GET /api/export/radar_items.csv — read-only, for Power BI's Web connector.
// Every Radar item in rank order (status is "active": Done / Snooze / Dismiss live in a browser).
import radarJson from "@/data/radar.json";
import { radarTable } from "@/lib/powerbi";
import { csvResponse } from "@/lib/export-response";
import type { RadarFile } from "@/lib/schemas";

export const dynamic = "force-static";

export function GET() {
  return csvResponse("radar_items.csv", radarTable((radarJson as RadarFile).items, null));
}
