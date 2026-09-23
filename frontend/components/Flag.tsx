import { DK, DE, FR, GB, IT, SA } from "country-flag-icons/react/3x2";

/**
 * Flag icons for the site's locales, from the `country-flag-icons` React set:
 * inline SVG, so they render identically everywhere.
 *
 * Deliberately not emoji: flag emoji fall back to their plain two-letter
 * code on Windows without the right font installed (Chrome included), which
 * defeats the entire point of showing a flag instead of "EN"/"FR"/"AR".
 *
 * Arabic is shown with the Saudi flag. Every real usage sets its own
 * width/height in CSS via `className`.
 */
const FLAGS = {
  en: GB,
  fr: FR,
  de: DE,
  it: IT,
  da: DK,
  ar: SA,
} as const;

export default function Flag({ code, className }: { code: string; className?: string }) {
  const Icon = FLAGS[code as keyof typeof FLAGS];
  if (!Icon) return null;
  return <Icon className={className} aria-hidden="true" />;
}
