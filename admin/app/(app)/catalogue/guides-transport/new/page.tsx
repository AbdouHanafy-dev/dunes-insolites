import type { Metadata } from "next";
import { ServiceExtraEditor } from "@/components/crud/ExtrasCrud";

export const metadata: Metadata = { title: "Nouvelle option guide/transport" };

export default function NewServiceOptionPage() {
  return <ServiceExtraEditor />;
}
