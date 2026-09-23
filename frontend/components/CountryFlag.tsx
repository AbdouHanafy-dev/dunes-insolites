import type { ComponentType } from "react";
import flags from "react-phone-number-input/flags";

// The package only types `{ title }`, but every generated flag component
// spreads the rest onto its <svg>, so className works at runtime.
type FlagComponent = ComponentType<{ title?: string; className?: string }>;

/**
 * A country flag for an ISO-3166 code, from the same `country-flag-icons`
 * React set the phone field uses - inline SVG, so no request to an outside
 * image host and no broken flags when one is unreachable. (Not emoji: Windows
 * Chrome renders regional-indicator emoji as literal letter pairs.)
 *
 * Unknown codes render nothing, so callers can fall back to their own icon.
 */
export default function CountryFlag({ iso, className }: { iso: string; className?: string }) {
  const Icon = (flags as unknown as Record<string, FlagComponent | undefined>)[iso.toUpperCase()];
  if (!Icon) return null;
  return <Icon className={className ? `flag-icon ${className}` : "flag-icon"} />;
}
