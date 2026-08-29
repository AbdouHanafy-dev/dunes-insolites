import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { getMaintenanceWindowById } from "@/lib/api";
import { MaintenanceEditor } from "@/components/crud/MaintenanceCrud";

export default async function EditMaintenancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return null;

  const item = await getMaintenanceWindowById(session.accessToken, id);
  if (!item) notFound();

  return <MaintenanceEditor id={id} initialData={item} />;
}
