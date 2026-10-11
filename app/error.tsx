"use client";

// Shown if any page crashes while rendering. Offers a retry instead of a blank screen.
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md space-y-3 py-16 text-center">
      <h1 className="text-xl font-semibold">Something went wrong on this page</h1>
      <p className="text-sm text-slate-600">
        Your saved approvals and edits are safe. Try again — if it keeps happening, use “Reset demo” in the header.
      </p>
      <button onClick={reset} className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700">
        Try again
      </button>
    </div>
  );
}
