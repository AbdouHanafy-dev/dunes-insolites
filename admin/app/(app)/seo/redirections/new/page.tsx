import type { Metadata } from "next";
import { RedirectEditor } from "@/components/crud/RedirectsCrud";

export const metadata: Metadata = { title: "Nouvelle redirection" };

export default function NewRedirectPage() {
  return <RedirectEditor />;
}
