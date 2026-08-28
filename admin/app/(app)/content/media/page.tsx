import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { getAllMediaAssets } from "@/lib/api";
import { MediaLibrary } from "@/components/crud/MediaCrud";

export const metadata: Metadata = { title: "Médiathèque" };

export default async function MediaPage() {
  const session = await getSession();
  if (!session) return null;

  const items = await getAllMediaAssets(session.accessToken);

  return <MediaLibrary initialItems={items} />;
}
