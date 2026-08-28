import type { Metadata } from "next";
import { NavigationEditor } from "@/components/crud/NavigationCrud";

export const metadata: Metadata = { title: "Nouvel élément de navigation" };

export default function NewNavigationItemPage() {
  return <NavigationEditor />;
}
