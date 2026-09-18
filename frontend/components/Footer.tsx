import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { getActivities, type SiteSettingsData } from "@/lib/api";
import { site } from "@/lib/site";
import Newsletter from "@/components/Newsletter";

export default async function Footer({ settings }: { settings: SiteSettingsData }) {
  const locale = await getLocale();
  const [activities, t] = await Promise.all([getActivities(locale), getTranslations("footer")]);

  // Two real nav columns, not three — the third ("Follow") folds into the
  // bottom bar below. A coordinates line replaces a decorative divider with
  // an actual fact (settings.coords is real, admin-editable). Both changes
  // are part of the differentiation pass (see audit-differentiation.md):
  // the old three-equal-column "Adventures / Company / Follow" shape was a
  // near-exact structural match to the competitor's footer.
  const coords = `${settings.coords.lat.toFixed(4)}°N, ${settings.coords.lng.toFixed(4)}°E`;

  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="top">
          <div className="footer-brand">
            <Link href="/" className="brand">
              <Image src="/logo-mark.png" alt="" width={62} height={62} />
              <span className="brand-text">
                <span className="bn">{site.name}</span>
                <span className="bl">{site.brandLine}</span>
              </span>
            </Link>
            <p>{t("tagline")}</p>
            <p className="footer-coords">
              {coords} — {settings.address}
            </p>
            <p className="footer-contact">
              <a href={`mailto:${settings.email}`}>{settings.email}</a>
              <span aria-hidden="true">·</span>
              <a href={`https://wa.me/${settings.whatsapp.replace(/[^\d]/g, "")}`} target="_blank" rel="noreferrer noopener">
                {settings.whatsapp}
              </a>
            </p>
            <Newsletter />
          </div>
          <div className="cols">
            <div>
              <h5>{t("adventures")}</h5>
              <ul>
                {activities.map((a) => (
                  <li key={a.slug}>
                    <Link href={`/activities/${a.slug}`}>{a.title}</Link>
                  </li>
                ))}
                <li>
                  <Link href="/activities">{t("allExperiences")}</Link>
                </li>
              </ul>
            </div>
            <div>
              <h5>{t("company")}</h5>
              <ul>
                <li>
                  <Link href="/about">{t("about")}</Link>
                </li>
                <li>
                  <Link href="/about#guides">{t("guides")}</Link>
                </li>
                <li>
                  <Link href="/safety">{t("safety")}</Link>
                </li>
                <li>
                  <Link href="/contact">{t("contact")}</Link>
                </li>
                <li>
                  <Link href="/guides">{t("desertGuides")}</Link>
                </li>
                <li>
                  <Link href="/faq">{t("faq")}</Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="bar">
          <span>© {new Date().getFullYear()} {site.legalName}.</span>
          <span className="bar-legal">
            <Link href="/legal/privacy">{t("privacy")}</Link>
            <Link href="/legal/terms">{t("terms")}</Link>
          </span>
          <span className="bar-social">
            {settings.social.map((s, i) => (
              <span key={s.label}>
                <a href={s.href} target="_blank" rel="noreferrer noopener">
                  {s.label}
                </a>
                {i < settings.social.length - 1 && <span aria-hidden="true"> · </span>}
              </span>
            ))}
          </span>
        </div>
      </div>
    </footer>
  );
}
