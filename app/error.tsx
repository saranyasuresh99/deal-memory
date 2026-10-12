"use client";

import { btn } from "@/components/ui";

// Shown if any page crashes while rendering. Offers a retry instead of a blank screen.
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md space-y-3 py-16 text-center">
      <h1 className="text-xl font-semibold text-navy">Something went wrong on this page</h1>
      <p className="text-sm text-muted">
        Your saved approvals and edits are safe. Try again — if it keeps happening, use “Reset demo” in the user menu.
      </p>
      <button onClick={reset} className={btn.primary}>
        Try again
      </button>
    </div>
  );
}
