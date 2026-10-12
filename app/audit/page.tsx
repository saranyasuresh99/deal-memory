import AuditLog from "@/components/debrief/AuditLog";
import { PageHeader } from "@/components/ui";

export default function AuditPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Audit log" subtitle="Every CRM change approved in Debrief: who, when, before, after and the source quote." />
      <AuditLog />
    </div>
  );
}
