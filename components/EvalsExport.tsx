"use client";

import { useRegisterExport } from "./shell/ExportContext";
import type { NoteCheck } from "@/lib/evals";

// Registers the Evals note table for the top-bar Export button. Renders nothing.
export default function EvalsExport({ checks }: { checks: (NoteCheck & { in_spec_set: boolean })[] }) {
  useRegisterExport("evals-recall.csv", () =>
    checks.map((c) => ({
      in_spec_set: c.in_spec_set ? "yes" : "no (broader check)",
      result: c.hit ? (c.strict_hit ? "hit" : "hit (generic only)") : "miss",
      account: c.account,
      matched_by: c.matched_by,
      note: c.note,
      context: c.context ?? "",
      file: c.file,
      radar_types: c.radar_types.join("; "),
    })),
  );
  return null;
}
