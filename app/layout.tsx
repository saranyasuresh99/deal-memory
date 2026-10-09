import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import Nav from "@/components/Nav";
import ModeBadge from "@/components/ModeBadge";
import { TODAY_LABEL } from "@/lib/config";

export const metadata: Metadata = {
  title: "AtliQ Deal Memory",
  description: "Makes the CRM a by-product of selling.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-slate-900 antialiased">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              AtliQ <span className="text-accent-600">Deal Memory</span>
            </Link>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              Today: {TODAY_LABEL}
            </span>
            <ModeBadge />
            <Nav />
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
