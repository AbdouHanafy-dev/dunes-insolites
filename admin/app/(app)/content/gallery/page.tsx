import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { getAllGalleryImages } from "@/lib/api";
import { GalleryList } from "@/components/crud/GalleryCrud";

export const metadata: Metadata = { title: "Galerie photos" };

export default async function GalleryPage() {
  const session = await getSession();
  if (!session) return null;

  const items = await getAllGalleryImages(session.accessToken);

  return <GalleryList initialItems={items} />;
}
