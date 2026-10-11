import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md space-y-3 py-16 text-center">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="text-sm text-slate-600">That account or page doesn’t exist in this prototype.</p>
      <Link href="/" className="inline-block rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700">
        Back to the Radar
      </Link>
    </div>
  );
}
