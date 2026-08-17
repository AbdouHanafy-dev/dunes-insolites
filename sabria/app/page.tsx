import Hero from "@/components/Hero";
import Activities from "@/components/Activities";
import Steps from "@/components/Steps";
import Experience from "@/components/Experience";
import GalleryStrip from "@/components/GalleryStrip";
import Reviews from "@/components/Reviews";
import BookDirect from "@/components/BookDirect";
import CTA from "@/components/CTA";
import { getStats } from "@/lib/api";
import { site } from "@/lib/site";

export default async function Home() {
  // The hero's bottom-left figures are the site's existing stats — the same
  // source the experience band reads from.
  const stats = await getStats();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name: site.legalName,
    description: site.description,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Sabria",
      addressRegion: "Kebili",
      addressCountry: "TN",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: site.coords.lat,
      longitude: site.coords.lng,
    },
    image: `${site.url}/images/hero-combined.jpg`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Hero stats={stats} />
      <Activities />
      <Steps />
      <Experience />
      <Reviews />
      <BookDirect />
      <GalleryStrip />
      <CTA />
    </>
  );
}
