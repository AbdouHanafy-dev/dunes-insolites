import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Tour } from "@/lib/types";
import Stars from "./Stars";
import { getSiteImages } from "@/lib/api";
import WishlistButton from "./WishlistButton";

/**
 * Grid card for /circuits and "also worth a look" related-tours sections —
 * same editorial treatment as ActivityCard (caption below the photo, no
 * hover-zoom-plus-scrim), applied to Route Insolite's product now that it
 * has a public page (18 Sep 2026, see docs/OPEN-QUESTIONS.md Q6's addendum).
 */
export default async function TourCard({
  tour,
  preload = false,
}: {
  tour: Tour;
  preload?: boolean;
}) {
  const [t, images] = await Promise.all([getTranslations("tourCard"), getSiteImages()]);
  const cover = tour.coverImage || images["circuit.default"];
  const hasReviews = (tour.reviewCount ?? 0) > 0;
  const hasDiscount = tour.originalPriceFrom != null && tour.originalPriceFrom > tour.priceFrom;
  const bookedYesterday = tour.bookedYesterdayCount ?? 0;

  return (
    <Link className="edit-card" href={`/circuits/${tour.slug}`}>
      <span className="edit-card-media">
        <WishlistButton slug={tour.slug} />
        {bookedYesterday > 0 && (
          <span className="edit-card-badge">{t("bookedYesterday", { count: bookedYesterday })}</span>
        )}
        <Image
          src={cover}
          alt={tour.title}
          fill
          sizes="(max-width: 900px) 100vw, 33vw"
          style={{ objectFit: "cover" }}
          preload={preload}
        />
      </span>
      <span className="edit-card-cap">
        <span className="idx-label">{tour.duration}</span>
        <span className="edit-card-title">{tour.title}</span>
        <span className="edit-card-desc">{tour.description}</span>
        <span className="edit-card-meta">
          {hasReviews && (
            <span className="edit-card-rating">
              <Stars n={Math.round(tour.averageRating ?? 0)} />
              <span className="edit-card-rating-count">{t("reviews", { count: tour.reviewCount ?? 0 })}</span>
            </span>
          )}
          <span className="edit-card-price">
            {hasDiscount && (
              <span className="edit-card-price-original">{tour.originalPriceFrom} €</span>
            )}
            <span className={hasDiscount ? "edit-card-price-discounted" : undefined}>
              {t("fromPrice", { price: tour.priceFrom })}
            </span>
          </span>
        </span>
        <span className="edit-card-arrow" aria-hidden="true">
          →
        </span>
      </span>
    </Link>
  );
}
