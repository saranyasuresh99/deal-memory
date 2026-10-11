"use client";

import { useEffect, useState } from "react";
import { clearStore } from "@/lib/store";

// Clears everything saved in this browser (approvals, edits, new leads, promises, dismissals, eval marks).
// Two clicks, so it can't be hit by accident.
export default function ResetDemoButton() {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);

  return (
    <button
      onClick={() => {
        if (!armed) return setArmed(true);
        clearStore();
        window.location.reload();
      }}
      title="Clear all approvals, edits, new leads, promises, dismissals and eval marks saved in this browser"
      className={`rounded-md border px-2.5 py-1 text-xs font-medium whitespace-nowrap ${
        armed ? "border-red-600 bg-red-600 text-white" : "border-slate-300 text-slate-600 hover:bg-slate-50"
      }`}
    >
      {armed ? "Click again to reset" : "Reset demo"}
    </button>
  );
}
