import Hero from "@/components/Hero";
import HeroBanner from "@/components/HeroBanner";
import Activities from "@/components/Activities";
import Stays from "@/components/Stays";
import ReviewsShowcase from "@/components/ReviewsShowcase";
import BookDirect from "@/components/BookDirect";
import Circuits from "@/components/Circuits";
import CTA from "@/components/CTA";
import { getCmsPage, getStats, getStays } from "@/lib/api";
import { getLocale, getTranslations } from "next-intl/server";

const CMS_SLUG = "home";

export default async function Home() {
  // The hero's bottom-left figures are the site's existing stats — the same
  // source the experience band reads from. The hero's experience preview
  // reads the same activity list as the header's Experiences menu. `stays`
  // is fetched again here (Stays.tsx also fetches it) only to read one
  // real fact — a stay's arrival time — for the closing CTA; lib/api's own
  // caching means this isn't a second network round trip in practice.
  const locale = await getLocale();
  const [stats, stays, tCta, cms] = await Promise.all([
    getStats(),
    getStays(locale),
    getTranslations("ctaDefault"),
    getCmsPage(CMS_SLUG, locale),
  ]);
  const arrival = stays[0]?.arrivalTime;

  // A published "home" CMS page doesn't replace this whole route the way
  // about/faq do (most sections below already read real data of their
  // own) - it only supplies per-section overrides, by block type, for the
  // sections that were pure hardcoded/translation copy. BookDirect falls
  // back to translations when its block is absent.
  const bookDirectOverride = cms?.blocks.find((b) => b.type === "bookDirect")?.data;

  return (
    <>
      {/* Sitewide business identity markup (LodgingBusiness) now lives in
          app/layout.tsx, not here — it applies to every page, not just this
          one. See DI-026. */}
      <Hero stats={stats} />
      <HeroBanner />
      {/* Circuits (Route Insolite) leads, then Stays: the nuitée is still
          the product being sold — Stays keeps its own full lead/feature
          treatment below — but the multi-day circuit is the first thing
          shown on the homepage now (business owner, explicit, 18 Sep
          2026). Activities are add-ons to a nuitée, so they stay last of
          the three catalogue sections. */}
      <Circuits />
      <Stays />
      <Activities />
      <BookDirect override={bookDirectOverride} />
      <ReviewsShowcase />
      <CTA note={arrival ? tCta("arrivalNote", { time: arrival }) : undefined} />
    </>
  );
}
