import type { Metadata } from "next";
import TourWizard from "@/components/tour-wizard/TourWizard";

export const metadata: Metadata = { title: "Nouveau tour" };

export default function NewTourPage() {
  return <TourWizard />;
}
