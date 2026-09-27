import type { Metadata } from "next";
import AuditLogTable from "@/components/audit/AuditLogTable";
import StaffEmailBackfillCard from "@/components/audit/StaffEmailBackfillCard";

export const metadata: Metadata = { title: "Journal d’activité" };

export default function AuditLogPage() {
  return (
    <div className="flex flex-col gap-6">
      <StaffEmailBackfillCard />
      <AuditLogTable />
    </div>
  );
}
