import type { Metadata } from "next";
import { ServiceOptionEditor } from "@/components/crud/ServiceOptionsCrud";

export const metadata: Metadata = { title: "Nouvelle option guide/transport" };

export default function NewServiceOptionPage() {
  return <ServiceOptionEditor />;
}
