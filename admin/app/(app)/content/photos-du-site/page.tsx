import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { getAllSiteImages } from "@/lib/api";
import SiteImagesManager from "@/components/crud/SiteImagesManager";

export const metadata: Metadata = { title: "Photos du site" };

export default async function SiteImagesPage() {
  const session = await getSession();
  if (!session) return null;

  const images = await getAllSiteImages(session.accessToken);

  return <SiteImagesManager images={images} />;
}
