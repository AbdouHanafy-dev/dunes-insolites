import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { getActivities } from "@/lib/api";
import { site } from "@/lib/site";
import Newsletter from "@/components/Newsletter";

export default async function Footer() {
  const locale = await getLocale();
  const [activities, t] = await Promise.all([getActivities(locale), getTranslations("footer")]);

  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="top">
          <div>
            <Link href="/" className="brand">
              <Image src="/logo-mark.png" alt="" width={62} height={62} />
              <span className="brand-text">
                <span className="bn">{site.name}</span>
                <span className="bl">{site.brandLine}</span>
              </span>
            </Link>
            <p>{t("tagline")}</p>
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
                {/* FAQ/guides content is FR/EN only today (see lib/guides.ts) -
                    hidden in the other 4 locales rather than linking to a
                    page that 404s there. */}
                {(locale === "fr" || locale === "en") && (
                  <>
                    <li>
                      <Link href="/guides">{t("desertGuides")}</Link>
                    </li>
                    <li>
                      <Link href="/faq">{t("faq")}</Link>
                    </li>
                  </>
                )}
              </ul>
            </div>
            <div>
              <h5>{t("follow")}</h5>
              <ul>
                {site.social.map((s) => (
                  <li key={s.label}>
                    <a href={s.href} target="_blank" rel="noreferrer noopener">
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <div className="bar">
          <span>© {new Date().getFullYear()} {site.legalName}.</span>
          <span style={{ display: "flex", gap: 18 }}>
            <Link href="/legal/privacy">{t("privacy")}</Link>
            <Link href="/legal/terms">{t("terms")}</Link>
          </span>
          <span>{t("location")}</span>
        </div>
      </div>
    </footer>
  );
}
