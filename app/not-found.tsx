import Link from "next/link";
import { btn } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md space-y-3 py-16 text-center">
      <h1 className="text-xl font-semibold text-navy">Page not found</h1>
      <p className="text-sm text-muted">That account or page doesn’t exist in this prototype.</p>
      <Link href="/" className={btn.primary}>
        Back to the Radar
      </Link>
    </div>
  );
}
