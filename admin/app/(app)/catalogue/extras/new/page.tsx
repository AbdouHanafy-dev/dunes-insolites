import type { Metadata } from "next";
import { ExtraEditor } from "@/components/crud/ExtrasCrud";

export const metadata: Metadata = { title: "Nouvel extra" };

export default function NewExtraPage() {
  return <ExtraEditor />;
}
