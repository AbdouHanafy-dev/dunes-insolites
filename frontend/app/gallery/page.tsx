import type { Metadata } from "next";
import GalleryGrid from "@/components/GalleryGrid";
import PageHead from "@/components/PageHead";
import CTA from "@/components/CTA";
import { getGallery } from "@/lib/api";
import { galleryTags } from "@/lib/data/gallery";

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "Photographs from the Sabria dunes — camel caravans, quad tracks, sandboard runs, and the gate at golden hour.",
  alternates: { canonical: "/gallery" },
};

export default async function GalleryPage() {
  const items = await getGallery();

  return (
    <>
      <PageHead
        eyebrow="From the sand"
        title="Golden hour, every time."
        lead="Every photo here was taken on a real trip, by our guides, on the dunes around Sabria. No stock, no staging."
        image="/images/camel.jpg"
      />

      <section className="section-sand">
        <div className="wrap">
          <GalleryGrid items={items} tags={galleryTags} />
        </div>
      </section>

      <CTA
        title="Want your own?"
        body="Every trip comes with photos and video from your guide, sent the next morning."
      />
    </>
  );
}
