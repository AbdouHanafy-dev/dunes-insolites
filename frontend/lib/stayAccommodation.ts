export const BIVOUAC_STAY_SLUG = "bivouac-desert-tunisie";

/**
 * The bivouac has one fixed sleeping setup. Its accommodation record exists
 * only so guests can inspect the tent; it is not a selectable or priced tier
 * like Tent / Room / Suite at the fixed camp.
 */
export function hasInformationalAccommodation(stay: { slug: string; accommodations?: unknown[] }): boolean {
  return stay.slug === BIVOUAC_STAY_SLUG && (stay.accommodations?.length ?? 0) > 0;
}

/**
 * The bivouac night already includes a camel trek out to the camp - offering
 * it again as a paid add-on would double-sell the same ride.
 */
export function isActivityIncludedInStay(stay: { slug: string } | null | undefined, activitySlug: string): boolean {
  return stay?.slug === BIVOUAC_STAY_SLUG && activitySlug === "camel-trek";
}
