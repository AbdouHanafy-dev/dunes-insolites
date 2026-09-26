import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import type { SiteSettingsData } from "@/lib/api";
import type { Activity, Stay, Tour } from "@/lib/types";
import { site } from "@/lib/site";
import { sortByPrice } from "@/lib/guestPricing";
import Newsletter from "@/components/Newsletter";

const MAX_PER_COLUMN = 6;

type FooterLink = { label: string; href: string };

/**
 * The site footer: who we are and how to reach us, the newsletter, then one
 * column each for the circuits, the accommodation, the activities and the
 * practical pages. The lists come from the catalogue, so a new circuit or
 * activity added in the back office appears here without a code change.
 */
export default async function Footer({
  settings,
  tours,
  stays,
  activities,
}: {
  settings: SiteSettingsData;
  tours: Tour[];
  stays: Stay[];
  activities: Activity[];
}) {
  const [t, tNav, tA] = await Promise.all([getTranslations("footer"), getTranslations("nav"), getTranslations("a11y")]);
  const coords = `${settings.coords.lat.toFixed(4)}°N · ${settings.coords.lng.toFixed(4)}°E`;

  const circuits: FooterLink[] = tours.slice(0, MAX_PER_COLUMN).map((tour) => ({
    label: tour.title,
    href: `/circuits/${tour.slug}`,
  }));

  // A stay with accommodation types is listed by its types (tent, room, suite); one without is listed itself.
  const accommodation: FooterLink[] = stays
    .flatMap((stay) =>
      (stay.accommodations?.length ?? 0) > 0
        ? sortByPrice(stay.accommodations!).map((a) => ({ label: a.title, href: `/camp/${stay.slug}/${a.slug}` }))
        : [{ label: stay.title, href: `/camp/${stay.slug}` }],
    )
    .slice(0, MAX_PER_COLUMN);

  const activityLinks: FooterLink[] = activities.slice(0, MAX_PER_COLUMN).map((a) => ({
    label: a.title,
    href: `/activities/${a.slug}`,
  }));

  const info: FooterLink[] = [
    { label: tNav("theCamp"), href: "/about" },
    { label: tNav("articles"), href: "/guides" },
    { label: tNav("faq"), href: "/faq" },
    { label: tNav("contact"), href: "/contact" },
    { label: t("favorites"), href: "/favoris" },
  ];

  const columns: { title: string; links: FooterLink[]; all?: FooterLink }[] = [
    { title: tNav("circuits"), links: circuits, all: { label: t("allCircuits"), href: "/circuits" } },
    { title: tNav("accommodation"), links: accommodation, all: { label: t("allAccommodation"), href: "/camp" } },
    { title: tNav("activities"), links: activityLinks, all: { label: t("allActivities"), href: "/activities" } },
    { title: t("info"), links: info },
  ];

  return (
    <footer className="pf">
      <div className="wrap">
        <div className="pf-main">
          <div className="pf-brand">
            <Link href="/" className="pf-logo" aria-label={site.name}>
              <Image src="/logo-mark.png" alt="" width={54} height={54} />
              <span>
                <strong>{site.name}</strong>
                <small>Sabria · Sahara</small>
              </span>
            </Link>
            <p className="pf-tagline">{t("tagline")}</p>
            <address className="pf-contact">
              <span>{settings.address}</span>
              <span className="pf-coords">{coords}</span>
              <a href={`mailto:${settings.email}`}>{settings.email}</a>
              <a
                href={`https://wa.me/${settings.whatsapp.replace(/[^\d]/g, "")}`}
                target="_blank"
                rel="noreferrer noopener"
              >
                WhatsApp · {settings.whatsapp}
              </a>
            </address>
            <div className="pf-newsletter">
              <Newsletter />
            </div>
          </div>

          <nav className="pf-cols" aria-label={tA("navFooter")}>
            {columns.map((col) =>
              col.links.length === 0 ? null : (
                <div key={col.title} className="pf-col">
                  <h5>{col.title}</h5>
                  <ul>
                    {col.links.map((link) => (
                      <li key={link.href}>
                        <Link href={link.href}>{link.label}</Link>
                      </li>
                    ))}
                  </ul>
                  {col.all && (
                    <Link href={col.all.href} className="pf-all">
                      {col.all.label} <span aria-hidden="true">→</span>
                    </Link>
                  )}
                </div>
              ),
            )}
          </nav>
        </div>

        <div className="pf-bar">
          <span>© {new Date().getFullYear()} {site.legalName}.</span>
          <span className="pf-legal">
            <Link href="/legal/privacy">{t("privacy")}</Link>
            <Link href="/legal/terms">{t("terms")}</Link>
          </span>
          <span className="pf-social">
            {settings.social.map((social, index) => (
              <span key={social.label}>
                <a href={social.href} target="_blank" rel="noreferrer noopener">{social.label}</a>
                {index < settings.social.length - 1 && <span aria-hidden="true"> · </span>}
              </span>
            ))}
          </span>
        </div>
      </div>
    </footer>
  );
}
