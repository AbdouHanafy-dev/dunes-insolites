import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getReviews, getSiteSettings, getStay } from "@/lib/api";
import { getStays } from "@/lib/data/stays";
import { breadcrumbJsonLd } from "@/lib/schema";
import { localeHref, localeAlternates } from "@/i18n/routing";
import { isDisplayableImageSrc } from "@/lib/imageSrc";
import AccommodationView from "@/components/AccommodationView";

type Props = { params: Promise<{ locale: string; slug: string; accommodation: string }> };

async function getAccommodation(params: Props["params"]) {
  const { locale, slug, accommodation: accommodationSlug } = await params;
  const stay = await getStay(slug, locale);
  const accommodation = stay?.accommodations?.find((item) => item.slug === accommodationSlug);
  return { stay, accommodation };
}

export function generateStaticParams() {
  return getStays().flatMap((stay) =>
    (stay.accommodations ?? []).map((accommodation) => ({ slug: stay.slug, accommodation: accommodation.slug })),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const { stay, accommodation } = await getAccommodation(params);
  if (!stay || !accommodation) return { title: "Not found" };
  return {
    title: `${accommodation.title} at ${stay.title}`,
    description: accommodation.description,
    alternates: localeAlternates(locale, (l) => localeHref(l, `/camp/${stay.slug}/${accommodation.slug}`)),
    openGraph: isDisplayableImageSrc(accommodation.image)
      ? { images: [{ url: accommodation.image, width: 1200, height: 630, alt: accommodation.title }] }
      : undefined,
  };
}

export default async function AccommodationDetail({ params }: Props) {
  const { locale } = await params;
  const [{ stay, accommodation }, tNav, reviews, settings] = await Promise.all([
    getAccommodation(params),
    getTranslations("nav"),
    getReviews(),
    getSiteSettings(),
  ]);
  if (!stay || !accommodation) notFound();

  const breadcrumbItems = [
    { name: tNav("home"), path: localeHref(locale, "/") },
    { name: tNav("stay"), path: localeHref(locale, "/camp") },
    { name: stay.title, path: localeHref(locale, `/camp/${stay.slug}`) },
    { name: accommodation.title, path: localeHref(locale, `/camp/${stay.slug}/${accommodation.slug}`) },
  ];
  const breadcrumbLd = breadcrumbJsonLd(breadcrumbItems);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <AccommodationView
        stay={stay}
        accommodation={accommodation}
        locale={locale}
        reviews={reviews}
        whatsapp={settings.whatsapp}
      />
    </>
  );
}
