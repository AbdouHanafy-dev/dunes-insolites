import { getActivities, getSiteImages, getStays, getTours } from "@/lib/api";
import { getTranslations } from "next-intl/server";
import { formatTourDuration } from "@/lib/tourDuration";
import { isDisplayableImageSrc } from "@/lib/imageSrc";
import { activityCardFallback, stayCardFallback } from "@/lib/siteImages";
import type { FavoriteKind } from "@/lib/favorites";

/** What the favourites page needs to draw one saved item as a card. */
export type FavoriteCatalogItem = {
  kind: FavoriteKind;
  slug: string;
  title: string;
  /** Small line above the title: duration, "Dunes Insolites", ... */
  kicker: string;
  image: string;
  href: string;
  priceFrom: number;
};

/**
 * Every circuit, stay and activity, in the shape of the favourites page.
 * The page filters this by what the visitor saved; the list is small, and
 * doing it here keeps the client free of data fetching.
 */
export async function getFavoritesCatalog(locale: string): Promise<FavoriteCatalogItem[]> {
  const tDuration = await getTranslations({ locale, namespace: "tourDuration" });
  const [tours, stays, activities, images] = await Promise.all([
    getTours(locale),
    getStays(locale),
    getActivities(locale),
    getSiteImages(),
  ]);

  return [
    ...tours.map((t): FavoriteCatalogItem => ({
      kind: "tour",
      slug: t.slug,
      title: t.title,
      kicker: formatTourDuration(tDuration, t),
      image: t.coverImage || images["circuit.default"],
      href: `/circuits/${t.slug}`,
      priceFrom: t.priceFrom,
    })),
    ...stays.map((s): FavoriteCatalogItem => ({
      kind: "stay",
      slug: s.slug,
      title: s.title,
      kicker: s.kicker,
      image: isDisplayableImageSrc(s.image) ? s.image : stayCardFallback(images, s.slug),
      href: `/camp/${s.slug}`,
      priceFrom: s.priceFrom,
    })),
    ...activities.map((a): FavoriteCatalogItem => ({
      kind: "activity",
      slug: a.slug,
      title: a.title,
      kicker: a.kicker,
      image: isDisplayableImageSrc(a.cardImage) ? a.cardImage : activityCardFallback(images, a.slug),
      href: `/activities/${a.slug}`,
      priceFrom: a.priceFrom,
    })),
  ];
}
