import { Link } from "@/i18n/navigation";
import { Price } from "@/components/Price";
import { getSiteSettings, getStays } from "@/lib/api";
import { getLocale, getTranslations } from "next-intl/server";

/** The strip is repeated this many times; it slides by exactly one copy, so
 *  the loop has no visible seam even on a very wide screen. */
const COPIES = 4;

/**
 * The scrolling banner under the hero: a continuous ticker of welcoming
 * phrases about what the camp really offers, plus two facts worth a
 * visitor's attention (the real Google rating and the lowest nightly
 * price - each left out if its data is missing). Pure CSS animation, no
 * JavaScript; paused on hover and switched off for visitors who prefer
 * reduced motion.
 */
export default async function HeroBanner() {
  const locale = await getLocale();
  const [t, settings, stays] = await Promise.all([
    getTranslations("heroBanner"),
    getSiteSettings(),
    getStays(locale),
  ]);

  const prices = stays.map((s) => s.priceFrom).filter((p): p is number => typeof p === "number" && p > 0);
  const fromPrice = prices.length ? Math.min(...prices) : null;

  const items: { key: string; node: React.ReactNode }[] = [
    { key: "salam", node: <strong>{t("salam")}</strong> },
    { key: "welcome", node: <>{t("welcome")}</> },
    { key: "dream", node: <>{t("dream")}</> },
    { key: "magic", node: <>{t("magic")}</> },
    { key: "stars", node: <>{t("stars")}</> },
  ];
  if (settings.googleRating != null) {
    items.push({
      key: "rating",
      node: (
        <>
          <span className="hero-marquee-star" aria-hidden="true">★</span>
          <strong>{settings.googleRating.toFixed(1)}</strong>
          {settings.googleRatingCount != null && (
            <span> · {t("ratingCount", { count: settings.googleRatingCount })}</span>
          )}
        </>
      ),
    });
  }
  items.push({ key: "camel", node: <>{t("camel")}</> });
  items.push({ key: "sunset", node: <>{t("sunset")}</> });
  if (fromPrice != null) {
    items.push({
      key: "price",
      node: (
        <>
          {t("fromLabel")} <strong><Price eur={fromPrice} /></strong> {t("nightUnit")}
        </>
      ),
    });
  }
  items.push({ key: "quad", node: <>{t("quad")}</> });
  items.push({ key: "invite", node: <strong>{t("invite")}</strong> });
  items.push({
    key: "cta",
    node: (
      <Link href="/book" className="hero-marquee-link">
        {t("cta")} →
      </Link>
    ),
  });

  return (
    <div className="hero-marquee" role="region" aria-label={t("ariaLabel")}>
      <div className="hero-marquee-track">
        {Array.from({ length: COPIES }, (_, copy) => (
          <ul className="hero-marquee-group" key={copy} aria-hidden={copy > 0 ? true : undefined} inert={copy > 0 ? true : undefined}>
            {items.map((item) => (
              <li key={item.key}>{item.node}</li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
