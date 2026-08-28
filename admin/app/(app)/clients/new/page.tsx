import type { Metadata } from "next";
import { ClientEditor } from "@/components/crud/ClientsCrud";

export const metadata: Metadata = { title: "Nouveau client" };

export default function NewClientPage() {
  return <ClientEditor />;
}
