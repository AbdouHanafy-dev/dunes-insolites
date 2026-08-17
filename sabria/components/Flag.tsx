/**
 * Small inline flag icons, one per locale in `lib/site.ts`.
 *
 * Deliberately not emoji: flag emoji fall back to their plain two-letter
 * code on Windows without the right font installed (Chrome included), which
 * defeats the entire point of showing a flag instead of "EN"/"FR"/"AR".
 * Inline SVG renders identically everywhere.
 */

type Code = "en" | "fr" | "de" | "it" | "da" | "ar";

const VIEWBOX = "0 0 20 15";

function GB() {
  return (
    <>
      <rect width="20" height="15" fill="#00247d" />
      <path d="M0 0 20 15M20 0 0 15" stroke="#fff" strokeWidth="3" />
      <path d="M0 0 20 15M20 0 0 15" stroke="#cf142b" strokeWidth="1" />
      <path d="M10 0V15M0 7.5H20" stroke="#fff" strokeWidth="5" />
      <path d="M10 0V15M0 7.5H20" stroke="#cf142b" strokeWidth="3" />
    </>
  );
}

function FR() {
  return (
    <>
      <rect width="6.67" height="15" fill="#0055a4" />
      <rect x="6.67" width="6.66" height="15" fill="#fff" />
      <rect x="13.33" width="6.67" height="15" fill="#ef4135" />
    </>
  );
}

function DE() {
  return (
    <>
      <rect width="20" height="5" fill="#000" />
      <rect y="5" width="20" height="5" fill="#dd0000" />
      <rect y="10" width="20" height="5" fill="#ffce00" />
    </>
  );
}

function IT() {
  return (
    <>
      <rect width="6.67" height="15" fill="#009246" />
      <rect x="6.67" width="6.66" height="15" fill="#fff" />
      <rect x="13.33" width="6.67" height="15" fill="#ce2b37" />
    </>
  );
}

function DA() {
  return (
    <>
      <rect width="20" height="15" fill="#c60c30" />
      <rect x="6.5" width="2.5" height="15" fill="#fff" />
      <rect y="6.25" width="20" height="2.5" fill="#fff" />
    </>
  );
}

function AR() {
  // Tunisia — the destination's own flag, not a generic pan-Arab one.
  return (
    <>
      <rect width="20" height="15" fill="#e70013" />
      <circle cx="10" cy="7.5" r="4" fill="#fff" />
      <circle cx="11.3" cy="7.5" r="3.2" fill="#e70013" />
      <path
        d="M9.8 5.6 10.2 6.85 11.5 6.85 10.45 7.6 10.85 8.85 9.8 8.1 8.75 8.85 9.15 7.6 8.1 6.85 9.4 6.85Z"
        fill="#e70013"
      />
    </>
  );
}

const FLAGS: Record<Code, () => React.ReactElement> = {
  en: GB,
  fr: FR,
  de: DE,
  it: IT,
  da: DA,
  ar: AR,
};

export default function Flag({ code, className }: { code: string; className?: string }) {
  const Shape = FLAGS[code as Code];
  if (!Shape) return null;
  return (
    // Default size is a fallback only — every real usage sets its own
    // width/height in CSS via `className`, which wins over these attributes.
    <svg className={className} viewBox={VIEWBOX} width="20" height="15" aria-hidden="true">
      <Shape />
    </svg>
  );
}
