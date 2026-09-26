import type { Metadata } from "next";
import { TourOptionEditor } from "@/components/crud/TourOptionsCrud";

export const metadata: Metadata = { title: "Nouvelle amélioration" };

export default function NewTourOptionPage() {
  return <TourOptionEditor />;
}
