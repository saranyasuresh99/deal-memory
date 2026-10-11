import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import Nav from "@/components/Nav";
import ModeBadge from "@/components/ModeBadge";
import ResetDemoButton from "@/components/ResetDemoButton";
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
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
            <Link href="/" className="text-lg font-semibold tracking-tight whitespace-nowrap">
              AtliQ <span className="text-accent-600">Deal Memory</span>
            </Link>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-slate-600">
              Today: {TODAY_LABEL}
            </span>
            <ModeBadge />
            {/* On phones: Reset sits at the end of the first row; on wider screens: after the nav. */}
            <div className="ml-auto lg:order-last lg:ml-0">
              <ResetDemoButton />
            </div>
            <Nav />
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 pt-2 pb-8 text-xs text-slate-400">
          Prototype with synthetic data. Nothing is ever sent to a client, and no CRM change happens without your approval.
        </footer>
      </body>
    </html>
  );
}
