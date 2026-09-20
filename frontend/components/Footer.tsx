import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import type { SiteSettingsData } from "@/lib/api";
import { site } from "@/lib/site";
import Newsletter from "@/components/Newsletter";

export default async function Footer({ settings }: { settings: SiteSettingsData }) {
  const [t, tNav] = await Promise.all([
    getTranslations("footer"),
    getTranslations("nav"),
  ]);
  const coords = `${settings.coords.lat.toFixed(4)}°N · ${settings.coords.lng.toFixed(4)}°E`;

  const explore = [
    { label: tNav("theCamp"), href: "/about" },
    { label: tNav("circuits"), href: "/circuits" },
    { label: tNav("accommodation"), href: "/camp" },
    { label: tNav("activities"), href: "/activities" },
    { label: tNav("gallery"), href: "/gallery" },
  ];

  const prepare = [
    { label: t("desertGuides"), href: "/guides" },
    { label: t("safety"), href: "/safety" },
    { label: t("faq"), href: "/faq" },
    { label: t("contact"), href: "/contact" },
  ];

  return (
    <footer className="site-footer pro-footer">
      <div className="wrap">
        <div className="footer-main">
          <div className="footer-brand">
            <Link href="/" className="brand" aria-label={site.name}>
              <Image src="/logo-mark.png" alt="" width={54} height={54} />
              <span className="brand-text">
                <span className="bn">{site.name}</span>
                <span className="bl">Sabria · Sahara</span>
              </span>
            </Link>
            <p className="footer-description">{t("tagline")}</p>
            <p className="footer-address">{settings.address}</p>
            <p className="footer-coordinates">{coords}</p>
            <p className="footer-contact">
              <a href={`mailto:${settings.email}`}>{settings.email}</a>
              <a href={`https://wa.me/${settings.whatsapp.replace(/[^\d]/g, "")}`} target="_blank" rel="noreferrer noopener">
                WhatsApp · {settings.whatsapp}
              </a>
            </p>
          </div>

          <nav className="cols" aria-label="Footer navigation">
            <div>
              <h5>{t("explore")}</h5>
              <ul>
                {explore.map((item) => (
                  <li key={item.href}><Link href={item.href}>{item.label}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h5>{t("prepare")}</h5>
              <ul>
                {prepare.map((item) => (
                  <li key={item.href}><Link href={item.href}>{item.label}</Link></li>
                ))}
              </ul>
            </div>
          </nav>

          <div className="footer-newsletter">
            <Newsletter />
          </div>
        </div>

        <div className="bar">
          <span>© {new Date().getFullYear()} {site.legalName}.</span>
          <span className="bar-legal">
            <Link href="/legal/privacy">{t("privacy")}</Link>
            <Link href="/legal/terms">{t("terms")}</Link>
          </span>
          <span className="bar-social">
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
