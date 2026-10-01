/**
 * Next.js's automatic loading UI, scoped to every page under [locale] -
 * shown the instant a navigation starts, for as long as the target page's
 * server component is fetching. Header/Footer (declared in this segment's
 * own layout.tsx) stay mounted underneath, same as error.tsx.
 *
 * A plain spinner rather than a content skeleton: page shapes on this site
 * range from the hero-heavy homepage to a plain table on /account, and a
 * skeleton built for one would look wrong on the other. Brand-colored, not
 * dependent on next-intl (a server component needing translations here
 * would need getTranslations per request - not worth it for a state with no
 * copy to translate).
 */
import { getTranslations } from "next-intl/server";

export default async function Loading() {
  const t = await getTranslations("a11y");
  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
      }}
    >
      <span
        role="status"
        aria-live="polite"
        style={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          border: "3px solid rgba(200, 100, 47, 0.18)",
          borderTopColor: "var(--accent)",
          animation: "spin 0.8s linear infinite",
        }}
      >
        <span
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            overflow: "hidden",
            clip: "rect(0,0,0,0)",
          }}
        >
          {t("loading")}
        </span>
      </span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
