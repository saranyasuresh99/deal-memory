"use client";

import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import Badge from "../Badge";
import { Card, SectionTitle, btn } from "../ui";
import { useStore } from "@/lib/store";
import { applyEdits } from "@/lib/overlay";
import { TODAY } from "@/lib/config";
import { formatDate } from "@/lib/format";
import { TYPE_META } from "@/lib/radar-meta";
import { OWED_TYPES, owedDays } from "@/lib/radar-view";
import type { RadarItem } from "@/lib/schemas";
import type { Account } from "@/lib/types";

// Right column of the account page: What AtliQ owes (open Radar items) and "CRM is out of date".
export default function AccountSide({ account, items, latestDocDate }: { account: Account; items: RadarItem[]; latestDocDate: string | null }) {
  const store = useStore();
  const a = applyEdits(account, store);
  const hidden = (id: string) => {
    const x = store.radar[id];
    return !!x && (x.status !== "snoozed" || (!!x.until && x.until > TODAY));
  };
  const owes = items.filter((i) => OWED_TYPES.includes(i.type) && !hidden(i.id));
  const outOfDate = latestDocDate !== null && (a.last_contact_date === null || latestDocDate > a.last_contact_date);

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <SectionTitle>What AtliQ owes</SectionTitle>
        {owes.length === 0 ? (
          <p className="text-sm text-muted">Nothing open on the Radar for this account.</p>
        ) : (
          <ul className="divide-y divide-line border-t border-line">
            {owes.map((o) => (
              <li key={o.id} className="py-2.5">
                <div className="flex items-start justify-between gap-3 text-sm">
                  <span className="text-ink">{o.suggested_next_action}</span>
                  <span className="shrink-0 text-muted">{owedDays(o)}</span>
                </div>
                <div className="mt-1">
                  <Badge tone={TYPE_META[o.type].tone}>{TYPE_META[o.type].label}</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
        <Link href="/" className={`${btn.link} mt-3 inline-block text-sm`}>
          Open the Radar →
        </Link>
      </Card>

      {outOfDate && (
        <div className="rounded-card border border-[#f2cf7a] bg-warn-bg p-4 text-sm text-warn-fg">
          <div className="flex items-center gap-2 font-semibold">
            <TriangleAlert size={16} /> CRM is out of date
          </div>
          <p className="mt-1">
            The latest email or note is from {formatDate(latestDocDate)}, but the CRM&apos;s last contact says{" "}
            {a.last_contact_date ? formatDate(a.last_contact_date) : "nothing"}.
          </p>
          <Link href="/debrief" className="mt-2 inline-block font-medium underline">
            Update it with a debrief
          </Link>
        </div>
      )}
    </div>
  );
}
