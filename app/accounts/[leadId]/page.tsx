import Link from "next/link";
import { notFound } from "next/navigation";
import { Copy } from "lucide-react";
import AccountFields from "@/components/AccountFields";
import BriefPanel from "@/components/BriefPanel";
import AccountTimeline from "@/components/account/AccountTimeline";
import AccountSide from "@/components/account/AccountSide";
import { btn } from "@/components/ui";
import radarJson from "@/data/radar.json";
import { accounts, documentsFor, getAccount } from "@/lib/data";
import { duplicatesFor, findDuplicates } from "@/lib/accounts";
import { timelineFor } from "@/lib/timeline";
import type { RadarFile } from "@/lib/schemas";
import type { Account } from "@/lib/types";

const radar = radarJson as RadarFile;

export function generateStaticParams() {
  return accounts.map((a) => ({ leadId: a.lead_id }));
}

export default async function AccountPage({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params;
  const a = getAccount(leadId);
  if (!a) notFound();

  const docs = documentsFor(a.lead_id);
  const dupes = duplicatesFor(a.lead_id, findDuplicates(accounts));
  const events = timelineFor(a, docs);
  const latestDocDate = events.find((e) => e.kind !== "CRM")?.date ?? null;
  const items = radar.items.filter((i) => i.lead_ids.length === 1 && i.lead_ids[0] === a.lead_id);

  return (
    <div className="space-y-6">
      <Link href="/accounts" className={`${btn.link} text-sm`}>
        ← All accounts
      </Link>

      {dupes.map((g) => (
        <DuplicateNotice key={g.lead_ids.join()} current={a} group={g} />
      ))}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)_300px]">
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <AccountFields account={a} duplicateLabels={dupes.map((g) => (g.kind === "duplicate" ? "Duplicate" : "Possible duplicate"))} />
        </div>
        <div className="min-w-0 space-y-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 xl:row-span-1">
          <BriefPanel account={a} docs={docs} />
          <AccountTimeline leadId={a.lead_id} events={events} docs={docs} />
        </div>
        <div className="min-w-0 lg:col-start-1 lg:row-start-2 xl:col-start-3 xl:row-start-1">
          <AccountSide account={a} items={items} latestDocDate={latestDocDate} />
        </div>
      </div>
    </div>
  );
}

function DuplicateNotice({ current, group }: { current: Account; group: { lead_ids: string[]; kind: string; reason: string } }) {
  const others = group.lead_ids.filter((id) => id !== current.lead_id).map((id) => getAccount(id)!);
  return (
    <div className="flex gap-3 rounded-card border border-line bg-dq-bg p-4 text-sm text-ink">
      <Copy size={18} className="mt-0.5 shrink-0 text-dq-fg" />
      <div>
        <div className="font-semibold text-navy">
          {group.kind === "duplicate" ? "Likely the same client as " : "Possibly the same client as "}
          {others.map((o) => (
            <Link key={o.lead_id} href={`/accounts/${o.lead_id}`} className={btn.link}>
              {o.company} ({o.lead_id}, owner {o.owner ?? "none"})
            </Link>
          ))}
        </div>
        <p className="mt-1 text-muted">{group.reason}</p>
        <p className="mt-1 text-muted">Records are never merged automatically — a person decides which to keep.</p>
      </div>
    </div>
  );
}
