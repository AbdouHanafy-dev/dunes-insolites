import type { Metadata } from "next";
import { ServiceExtraEditor } from "@/components/crud/ExtrasCrud";

export const metadata: Metadata = { title: "Nouveau véhicule ou transport" };

export default function NewServiceOptionPage() {
  return <ServiceExtraEditor />;
}
