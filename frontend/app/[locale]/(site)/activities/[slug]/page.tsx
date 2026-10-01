import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getActivities, getActivity, getReviews, getSiteSettings, getStays } from "@/lib/api";
import { getActivities as seedActivities } from "@/lib/data/activities";
import { averageRating } from "@/lib/data/reviews";
import { canonicalActivityPath } from "@/lib/legacySlugs";
import { localeHref, localeAlternates } from "@/i18n/routing";
import { breadcrumbJsonLd } from "@/lib/schema";
import { isDisplayableImageSrc } from "@/lib/imageSrc";
import ActivityView from "@/components/ActivityView";
import { site } from "@/lib/site";

type Props = { params: Promise<{ locale: string; slug: string }> };

export function generateStaticParams() {
  return seedActivities().map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const activity = await getActivity(slug, locale);
  if (!activity) return { title: "Not found" };

  return {
    title: activity.title,
    description: activity.tagline,
    alternates: localeAlternates(locale, (l) => canonicalActivityPath(activity.slug, l)),
    openGraph: {
      title: `${activity.title} — ${site.name}`,
      description: activity.tagline,
      images: isDisplayableImageSrc(activity.heroImage)
        ? [{ url: activity.heroImage, width: 1200, height: 630, alt: activity.title }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${activity.title} — ${site.name}`,
      description: activity.tagline,
      images: isDisplayableImageSrc(activity.heroImage) ? [activity.heroImage] : undefined,
    },
  };
}

export default async function ActivityDetail({ params }: Props) {
  const { locale, slug } = await params;
  const activity = await getActivity(slug, locale);
  if (!activity) notFound();

  const [allActivities, stays, activityReviews, settings, tNav] = await Promise.all([
    getActivities(locale),
    getStays(locale),
    getReviews({ activitySlug: slug }),
    getSiteSettings(),
    getTranslations("nav"),
  ]);
  const stay = stays.find((s) => (s.accommodations?.length ?? 0) > 0);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: activity.title,
    description: activity.tagline,
    ...(isDisplayableImageSrc(activity.heroImage) ? { image: `${site.url}${activity.heroImage}` } : {}),
    offers: {
      "@type": "Offer",
      price: activity.priceFrom,
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
    },
    // Rich-result star ratings in Google. Only emitted when reviews exist —
    // aggregateRating with no reviews behind it is a manual-action risk.
    ...(activityReviews.length
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: averageRating(activityReviews),
            reviewCount: activityReviews.length,
          },
        }
      : {}),
  };

  const breadcrumbLd = breadcrumbJsonLd([
    { name: tNav("home"), path: localeHref(locale, "/") },
    { name: tNav("experiences"), path: localeHref(locale, "/activities") },
    { name: activity.title, path: canonicalActivityPath(activity.slug, locale) },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <ActivityView activity={activity} allActivities={allActivities} stay={stay} whatsapp={settings.whatsapp} />
    </>
  );
}
