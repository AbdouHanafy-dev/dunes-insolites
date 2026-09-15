import Hero from "@/components/Hero";
import Activities from "@/components/Activities";
import Stays from "@/components/Stays";
import Steps from "@/components/Steps";
import Experience from "@/components/Experience";
import Location from "@/components/Location";
import GalleryStrip from "@/components/GalleryStrip";
import ReviewsShowcase from "@/components/ReviewsShowcase";
import BookDirect from "@/components/BookDirect";
import CTA from "@/components/CTA";
import { getActivities, getStats, getStays } from "@/lib/api";
import { getLocale, getTranslations } from "next-intl/server";
import { site } from "@/lib/site";

export default async function Home() {
  // The hero's bottom-left figures are the site's existing stats — the same
  // source the experience band reads from. The hero's experience preview
  // reads the same activity list as the header's Experiences menu. `stays`
  // is fetched again here (Stays.tsx also fetches it) only to read one
  // real fact — a stay's arrival time — for the closing CTA; lib/api's own
  // caching means this isn't a second network round trip in practice.
  const locale = await getLocale();
  const [stats, activities, stays, tCta] = await Promise.all([
    getStats(),
    getActivities(locale),
    getStays(locale),
    getTranslations("ctaDefault"),
  ]);
  const arrival = stays[0]?.arrivalTime;

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
      <Location meetingPoint={activities[0]?.meetingPoint} />
      <ReviewsShowcase />
      <BookDirect />
      <GalleryStrip />
      {/* site.address already reads "Sabria, Kebili Governorate, Tunisia" —
          prefixing it with "Sabria ·" duplicated the name (found live). */}
      <CTA
        place={site.address}
        note={arrival ? tCta("arrivalNote", { time: arrival }) : undefined}
      />
    </>
  );
}
