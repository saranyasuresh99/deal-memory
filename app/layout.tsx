import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/shell/AppShell";
import type { ShellData } from "@/components/shell/Sidebar";
import radarJson from "@/data/radar.json";
import answerKey from "@/data/answer_key.json";
import { accounts, documents } from "@/lib/data";
import { isLiveMode } from "@/lib/ai";
import { TODAY } from "@/lib/config";
import { formatDate, weekday } from "@/lib/format";
import { quoteStats } from "@/lib/verify-stats";
import { runEvals } from "@/lib/evals";
import type { RadarFile } from "@/lib/schemas";
import type { EditorialNote } from "@/lib/types";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-poppins", display: "swap" });

export const metadata: Metadata = {
  title: "AtliQ Deal Memory",
  description: "Makes the CRM a by-product of selling.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

const radar = radarJson as RadarFile;

function shellData(): ShellData {
  const evals = runEvals(answerKey as Record<string, EditorialNote[]>, documents, accounts, radar.items);
  return {
    live: isLiveMode(),
    quotes: quoteStats(),
    radarIds: radar.items.map((i) => i.id),
    overduePromiseIds: radar.items
      .filter((i) => i.type === "promise_overdue" || (i.type === "promise_due" && (i.days_overdue ?? 0) > 0))
      .map((i) => i.id),
    crmCount: accounts.length,
    recallPct: evals.checks.length ? `${Math.round(evals.recall * 100)}%` : "–",
    accounts: accounts.map((a) => ({ lead_id: a.lead_id, company: a.company })),
    owners: [...new Set(accounts.map((a) => a.owner).filter((o): o is string => !!o))].sort(),
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={poppins.variable}>
      <body className="font-sans antialiased">
        <AppShell data={shellData()} todayLabel={`${weekday(TODAY)} ${formatDate(TODAY)}`}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
