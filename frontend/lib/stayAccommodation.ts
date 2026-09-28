/**
 * The bivouac has one fixed sleeping setup. Its accommodation record exists
 * only so guests can inspect the tent; it is not a selectable or priced tier
 * like Tent / Room / Suite at the fixed camp.
 */
export function hasInformationalAccommodation(stay: { slug: string; accommodations?: unknown[] }): boolean {
  return stay.slug === "bivouac-desert-tunisie" && (stay.accommodations?.length ?? 0) > 0;
}
