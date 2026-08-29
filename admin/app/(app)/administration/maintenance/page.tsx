import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { getAllMaintenanceWindows } from "@/lib/api";
import { MaintenanceList } from "@/components/crud/MaintenanceCrud";

export const metadata: Metadata = { title: "Maintenance" };

export default async function MaintenancePage() {
  const session = await getSession();
  if (!session) return null;

  const items = await getAllMaintenanceWindows(session.accessToken);

  return <MaintenanceList initialItems={items} />;
}
