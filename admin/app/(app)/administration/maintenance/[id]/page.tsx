import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { getMaintenanceWindowById } from "@/lib/api";
import { getSitemapPaths } from "@/lib/sitemap";
import { MaintenanceEditor } from "@/components/crud/MaintenanceCrud";

export default async function EditMaintenancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return null;

  const [item, paths] = await Promise.all([
    getMaintenanceWindowById(session.accessToken, id),
    getSitemapPaths(),
  ]);
  if (!item) notFound();

  const pageOptions = paths.map((p) => ({ value: p, label: p }));
  return <MaintenanceEditor id={id} initialData={item} pageOptions={pageOptions} />;
}
