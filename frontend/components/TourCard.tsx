import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Tour } from "@/lib/types";
import Stars from "./Stars";
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
  const t = await getTranslations("tourCard");
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
        {tour.coverImage ? (
          <Image
            src={tour.coverImage}
            alt={tour.title}
            fill
            sizes="(max-width: 900px) 100vw, 33vw"
            style={{ objectFit: "cover" }}
            priority={preload}
          />
        ) : (
          // No cover photo uploaded for this Tour yet (admin catalogue gap,
          // not a bug) — a flat fill the same colour as the page background
          // read as a rendering error (found live, 18 Sep 2026). A visible
          // placeholder is the honest signal instead.
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              background:
                "radial-gradient(circle at 30% 30%, rgba(217,154,92,.35), rgba(160,74,47,.18))",
            }}
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" style={{ color: "var(--color-ember)", opacity: 0.55 }}>
              <path d="M3 17l5-6 3 3 4-5 6 8" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="8" cy="7" r="2" />
            </svg>
          </span>
        )}
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
