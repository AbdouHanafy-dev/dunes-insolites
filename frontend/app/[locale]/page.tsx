import Hero from "@/components/Hero";
import Activities from "@/components/Activities";
import Stays from "@/components/Stays";
import Steps from "@/components/Steps";
import Experience from "@/components/Experience";
import GalleryStrip from "@/components/GalleryStrip";
import ReviewsShowcase from "@/components/ReviewsShowcase";
import BookDirect from "@/components/BookDirect";
import CTA from "@/components/CTA";
import { getActivities, getStats } from "@/lib/api";
import { getLocale } from "next-intl/server";

export default async function Home() {
  // The hero's bottom-left figures are the site's existing stats — the same
  // source the experience band reads from. The hero's experience preview
  // reads the same activity list as the header's Experiences menu.
  const locale = await getLocale();
  const [stats, activities] = await Promise.all([getStats(), getActivities(locale)]);

  return (
    <>
      {/* Sitewide business identity markup (LodgingBusiness) now lives in
          app/layout.tsx, not here — it applies to every page, not just this
          one. See DI-026. */}
      <Hero stats={stats} activities={activities} />
      {/* Stays lead: the nuitée is the product being sold, and the rides are
          add-ons to it. Showing the rides first framed them as the offer. */}
      <Stays />
      <Activities />
      <Steps />
      <Experience />
      <ReviewsShowcase />
      <BookDirect />
      <GalleryStrip />
      <CTA />
    </>
  );
}
