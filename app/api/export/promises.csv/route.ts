// GET /api/export/promises.csv — read-only, for Power BI's Web connector.
// Promises found by the Radar (base data). Promises added from Debrief live in a browser and are not included.
import radarJson from "@/data/radar.json";
import { promisesTable } from "@/lib/powerbi";
import { csvResponse } from "@/lib/export-response";
import type { RadarFile } from "@/lib/schemas";

export const dynamic = "force-static";

export function GET() {
  return csvResponse("promises.csv", promisesTable((radarJson as RadarFile).items, null));
}
