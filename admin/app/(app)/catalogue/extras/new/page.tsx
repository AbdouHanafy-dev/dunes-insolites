import type { Metadata } from "next";
import { ExtraEditor } from "@/components/crud/ExtrasCrud";

export const metadata: Metadata = { title: "Nouvelle activité" };

export default function NewExtraPage() {
  return <ExtraEditor />;
}
