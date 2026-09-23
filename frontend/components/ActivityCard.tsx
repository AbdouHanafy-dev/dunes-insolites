import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { Activity } from "@/lib/types";
import { isDisplayableImageSrc } from "@/lib/imageSrc";

/**
 * Used by the /activities listing page and "also on the sand" related
 * sections — grid contexts, unlike the homepage's row-based
 * Activities.tsx. Redesigned (visual identity pass, follow-up 14 Sep 2026)
 * off the hover-zoom + dark-scrim `.card` treatment: caption below the
 * photo, no zoom, matching the editorial language the homepage now uses
 * instead of leaving this one card grid on the old template.
 */
export default function ActivityCard({
  activity,
  preload = false,
}: {
  activity: Activity;
  preload?: boolean;
}) {
  return (
    <Link className="edit-card" href={`/activities/${activity.slug}`}>
      <span className="edit-card-media">
        {isDisplayableImageSrc(activity.cardImage) && (
          <Image
            src={activity.cardImage}
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
        <span className="edit-card-arrow" aria-hidden="true">
          →
        </span>
      </span>
    </Link>
  );
}
