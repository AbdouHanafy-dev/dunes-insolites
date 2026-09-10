import type { Metadata } from "next";
import { getSitemapPaths } from "@/lib/sitemap";
import { MaintenanceEditor } from "@/components/crud/MaintenanceCrud";

export const metadata: Metadata = { title: "Nouvelle fenêtre de maintenance" };

export default async function NewMaintenancePage() {
  const paths = await getSitemapPaths();
  const pageOptions = paths.map((p) => ({ value: p, label: p }));
  return <MaintenanceEditor pageOptions={pageOptions} />;
}
