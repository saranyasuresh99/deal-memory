import Link from "next/link";
import { accounts, documents } from "@/lib/data";

export default function Home() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Revenue Leak Radar</h1>
        <p className="mt-1 text-slate-600">
          The daily ranked list of revenue leaks arrives in the next build phase.
        </p>
      </div>
      <div className="rounded-xl border border-slate-200 p-5 shadow-sm">
        <p className="text-sm text-slate-600">Data loaded so far:</p>
        <p className="mt-1 text-lg font-medium">
          {accounts.length} CRM accounts · {documents.length} emails &amp; meeting notes
        </p>
        <Link
          href="/accounts"
          className="mt-4 inline-block rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700"
        >
          Browse accounts →
        </Link>
      </div>
    </div>
  );
}
