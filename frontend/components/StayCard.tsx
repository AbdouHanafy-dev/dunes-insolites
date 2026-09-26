import Image from "next/image";
import { PriceText } from "@/components/Price";
import { priceToken } from "@/lib/currency";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Stay } from "@/lib/types";
import { isDisplayableImageSrc } from "@/lib/imageSrc";
import { getSiteImages } from "@/lib/api";
import WishlistButton from "@/components/WishlistButton";
import { stayCardFallback } from "@/lib/siteImages";

/**
 * Used by the /camp listing page and "other stays" on a stay's detail page
 * — grid contexts, unlike the homepage's row-based Stays.tsx. Redesigned
 * (visual identity pass, follow-up 14 Sep 2026) off the hover-zoom +
 * dark-scrim `.card` treatment shared with the old ActivityCard: caption
 * now sits below the photo, not on top of it, and the hover feedback is a
 * small image shift instead of a zoom — matching the editorial language
 * introduced elsewhere on the site instead of the one card grid left
 * behind when Stays.tsx/Activities.tsx were restructured.
 */
export default async function StayCard({ stay }: { stay: Stay }) {
  const [t, images] = await Promise.all([getTranslations("staysSection"), getSiteImages()]);
  const photo = isDisplayableImageSrc(stay.image) ? stay.image : stayCardFallback(images, stay.slug);

  return (
    <Link className="edit-card" href={`/camp/${stay.slug}`}>
      <span className="edit-card-media">
        <WishlistButton slug={stay.slug} kind="stay" />
        {(
          <Image
            src={photo}
            alt={stay.tagline}
            fill
            sizes="(max-width: 900px) 100vw, 33vw"
            style={{ objectFit: "cover" }}
          />
        )}
      </span>
      <span className="edit-card-cap">
        <span className="idx-label">{stay.kicker}</span>
        <span className="edit-card-title">{stay.title}</span>
        <span className="edit-card-desc">{stay.description}</span>
        <span className="edit-card-meta">
          <span className="edit-card-price">{<PriceText text={t("fromPrice", { price: priceToken(stay.priceFrom)})} />}</span>
        </span>
        <span className="edit-card-arrow" aria-hidden="true">
          →
        </span>
      </span>
    </Link>
  );
}
