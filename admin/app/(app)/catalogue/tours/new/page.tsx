import type { Metadata } from "next";
import { TourEditor } from "@/components/crud/ToursCrud";

export const metadata: Metadata = { title: "Nouveau tour" };

export default function NewTourPage() {
  return <TourEditor />;
}
