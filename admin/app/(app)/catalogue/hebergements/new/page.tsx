import type { Metadata } from "next";
import { HebergementEditor } from "@/components/crud/HebergementsCrud";

export const metadata: Metadata = { title: "Nouvel hébergement" };

export default function NewHebergementPage() {
  return <HebergementEditor />;
}
