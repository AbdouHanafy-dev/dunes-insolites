import Image from "next/image";
import { PriceText } from "@/components/Price";
import { priceToken } from "@/lib/currency";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Activity } from "@/lib/types";
import { isDisplayableImageSrc } from "@/lib/imageSrc";
import { getSiteImages } from "@/lib/api";
import WishlistButton from "@/components/WishlistButton";
import { activityCardFallback } from "@/lib/siteImages";

/**
 * Used by the /activities listing page and "also on the sand" related
 * sections — grid contexts, unlike the homepage's row-based
 * Activities.tsx. Redesigned (visual identity pass, follow-up 14 Sep 2026)
 * off the hover-zoom + dark-scrim `.card` treatment: caption below the
 * photo, no zoom, matching the editorial language the homepage now uses
 * instead of leaving this one card grid on the old template.
 */
export default async function ActivityCard({
  activity,
  preload = false,
}: {
  activity: Activity;
  preload?: boolean;
}) {
  const [t, images] = await Promise.all([getTranslations("activitiesSection"), getSiteImages()]);
  const photo = isDisplayableImageSrc(activity.cardImage) ? activity.cardImage : activityCardFallback(images, activity.slug);

  return (
    <Link className="edit-card" href={`/activities/${activity.slug}`}>
      <span className="edit-card-media">
        <WishlistButton slug={activity.slug} kind="activity" />
        {(
          <Image
            src={photo}
            alt={activity.tagline}
            fill
            sizes="(max-width: 900px) 100vw, 33vw"
            style={{ objectFit: "cover" }}
            preload={preload}
          />
        )}
      </span>
      <span className="edit-card-cap">
        <span className="idx-label">{activity.kicker}</span>
        <span className="edit-card-title">{activity.title}</span>
        <span className="edit-card-desc">{activity.description}</span>
        <span className="edit-card-meta">
          <span className="edit-card-price">
            {activity.priceFrom > 0 ? <PriceText text={t("fromPrice", { price: priceToken(activity.priceFrom)})} /> : t("included")}
          </span>
        </span>
        <span className="edit-card-arrow" aria-hidden="true">
          →
        </span>
      </span>
    </Link>
  );
}
