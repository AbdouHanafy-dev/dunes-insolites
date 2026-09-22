/**
 * A country flag image for an ISO-3166 code, via flagcdn.com's SVGs — for
 * the booking flow's broader country lists (phone dial codes, spoken
 * languages), which cover far more countries than `components/Flag.tsx`'s
 * hand-drawn set (one inline SVG per site locale). Same reason as that
 * component: Windows Chrome renders regional-indicator emoji as literal
 * letter pairs ("GB", "FR"...) instead of a flag glyph, so an image is
 * needed — hand-illustrating dozens of flags isn't a reasonable use of
 * that approach at this scale, so this one goes through flagcdn.com.
 */
export default function CountryFlag({ iso, className }: { iso: string; className?: string }) {
  return (
    <img
      src={`https://flagcdn.com/${iso.toLowerCase()}.svg`}
      alt=""
      aria-hidden="true"
      loading="lazy"
      className={className ? `flag-icon ${className}` : "flag-icon"}
    />
  );
}
