import type { Metadata } from "next";
import { MaintenanceEditor } from "@/components/crud/MaintenanceCrud";

export const metadata: Metadata = { title: "Nouvelle fenêtre de maintenance" };

export default function NewMaintenancePage() {
  return <MaintenanceEditor />;
}
