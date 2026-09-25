import type { Metadata } from "next";
import AuditLogTable from "@/components/audit/AuditLogTable";

export const metadata: Metadata = { title: "Journal d’activité" };

export default function AuditLogPage() {
  return <AuditLogTable />;
}
