import type { Metadata } from "next";
import { GalleryEditor } from "@/components/crud/GalleryCrud";

export const metadata: Metadata = { title: "Nouvelle photo" };

export default function NewGalleryImagePage() {
  return <GalleryEditor />;
}
