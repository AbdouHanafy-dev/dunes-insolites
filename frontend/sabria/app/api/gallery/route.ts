import { fullGallery } from "@/lib/data/gallery";

export async function GET() {
  return Response.json({ items: fullGallery });
}
