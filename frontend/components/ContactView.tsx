import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import ContactForm from "@/components/ContactForm";
import Reveal from "@/components/Reveal";
import { getSiteImages, getSiteSettings } from "@/lib/api";

type Channel = { title: string; hint: string; cta: string };

const ICON_PROPS = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

const Icons = {
  whatsapp: (
    <svg {...ICON_PROPS}>
      <path d="M20 11.5a8 8 0 0 1-11.9 7L4 20l1.5-4A8 8 0 1 1 20 11.5Z" />
      <path d="M9 9.5c.3 2.2 2.3 4.2 5 5l1.2-1.2-1.8-1-.8.6a4 4 0 0 1-1.6-1.6l.6-.8-1-1.8Z" />
    </svg>
  ),
  phone: (
    <svg {...ICON_PROPS}>
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />
    </svg>
  ),
  email: (
    <svg {...ICON_PROPS}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  ),
  visit: (
    <svg {...ICON_PROPS}>
      <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  ),
  check: (
    <svg {...ICON_PROPS} width={18} height={18}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  ),
  clock: (
    <svg {...ICON_PROPS} width={18} height={18}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
} as const;

/**
 * The contact page: a photo header, the four ways to reach the camp as
 * cards (WhatsApp first: it is the fastest), the form, and how to find the
 * camp with its map. Nothing is invented: the response time matches what the
 * booking emails already promise, and the location facts (about 3 km from
 * Sabria, regular car) come from the owner via the About page.
 */
export default async function ContactView({ title, lead }: { title?: string; lead?: string }) {
  const [t, tContact, images, settings] = await Promise.all([
    getTranslations("contactPage"),
    getTranslations("contact"),
    getSiteImages(),
    getSiteSettings(),
  ]);

  const { lat, lng } = settings.coords;
  const waDigits = settings.whatsapp.replace(/[^\d]/g, "");
  const waHref = waDigits ? `https://wa.me/${waDigits}?text=${encodeURIComponent(t("hero.whatsappText"))}` : "#message";
  const telHref = `tel:${settings.phone.replace(/\s/g, "")}`;
  const directionsHref = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.08}%2C${lat - 0.06}%2C${
    lng + 0.08
  }%2C${lat + 0.06}&layer=mapnik&marker=${lat}%2C${lng}`;

  const channels: { key: keyof typeof Icons; value: string; href: string; external?: boolean }[] = [
    { key: "whatsapp", value: settings.whatsapp, href: waHref, external: true },
    { key: "phone", value: settings.phone, href: telHref },
    { key: "email", value: settings.email, href: `mailto:${settings.email}` },
    { key: "visit", value: settings.address, href: directionsHref, external: true },
  ];
  const helpItems = t.raw("help.items") as string[];

  return (
    <div className="ab ct">
      {/* 1 — Header */}
      <section className="ab-hero ct-hero">
        <Image src={images["contact.hero"]} alt="" fill priority sizes="100vw" className="ab-hero-img" />
        <div className="ab-hero-shade" />
        <div className="wrap ab-hero-inner">
          <p className="ab-eyebrow ab-eyebrow--light">{t("hero.eyebrow")}</p>
          <h1>{title || t("hero.title")}</h1>
          <p className="ab-hero-lead">{lead || t("hero.lead")}</p>
          <div className="ct-hero-actions">
            <a href={waHref} className="ab-btn ab-btn--light" target="_blank" rel="noopener noreferrer">
              {t("hero.ctaWhatsapp")}
            </a>
            <a href="#message" className="ab-btn ab-btn--ghost">
              {t("hero.ctaForm")}
            </a>
          </div>
          <p className="ct-badge">
            {Icons.clock}
            {t("hero.badge")}
          </p>
        </div>
      </section>

      {/* 2 — Ways to reach us */}
      <section className="ct-channels-wrap">
        <div className="wrap">
          <ul className="ct-channels">
            {channels.map((c, i) => {
              const info = t.raw(`channels.${c.key}`) as Channel;
              return (
                <li key={c.key}>
                  <Reveal delay={i * 60}>
                    <a
                      href={c.href}
                      className={`ct-channel${c.key === "whatsapp" ? " ct-channel--primary" : ""}`}
                      {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    >
                      <span className="ct-channel-icon">{Icons[c.key]}</span>
                      <span className="ct-channel-body">
                        <span className="ct-channel-title">{info.title}</span>
                        <span className="ct-channel-hint">{info.hint}</span>
                        <span className="ct-channel-value">{c.value}</span>
                      </span>
                      <span className="ct-channel-cta">
                        {info.cta} <span aria-hidden="true">→</span>
                      </span>
                    </a>
                  </Reveal>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* 3 — Form + help */}
      <section className="ab-section ct-main" id="message">
        <div className="wrap ct-main-grid">
          <Reveal className="ct-form-card">
            <p className="ab-eyebrow">{t("form.eyebrow")}</p>
            <h2>{t("form.title")}</h2>
            <p className="ct-form-lead">{t("form.lead")}</p>
            <ContactForm />
            <p className="ct-form-note">{t("form.note")}</p>
          </Reveal>

          <Reveal className="ct-help" delay={100}>
            <p className="ab-eyebrow">{t("help.eyebrow")}</p>
            <h2>{t("help.title")}</h2>
            <ul className="ct-help-list">
              {helpItems.map((item) => (
                <li key={item}>
                  <span className="ct-help-check">{Icons.check}</span>
                  {item}
                </li>
              ))}
            </ul>
            <dl className="ct-hours">
              <div>
                <dt>{t("find.hoursLabel")}</dt>
                <dd>{tContact("deskHoursValue")}</dd>
              </div>
            </dl>
          </Reveal>
        </div>
      </section>

      {/* 4 — Find us */}
      <section className="ab-section ct-find">
        <div className="wrap ct-find-grid">
          <Reveal className="ct-find-copy">
            <p className="ab-eyebrow">{t("find.eyebrow")}</p>
            <h2>{t("find.title")}</h2>
            <p>{t("find.text")}</p>
            <dl className="ct-hours">
              <div>
                <dt>{t("find.addressLabel")}</dt>
                <dd>{settings.address}</dd>
              </div>
            </dl>
            <div className="ct-find-actions">
              <a href={directionsHref} className="ab-btn ab-btn--terracotta" target="_blank" rel="noopener noreferrer">
                {t("find.directions")}
              </a>
              <a href={mapsHref} className="ab-link" target="_blank" rel="noopener noreferrer">
                {t("find.openMaps")} <span aria-hidden="true">↗</span>
              </a>
            </div>
          </Reveal>
          <Reveal className="ct-map" delay={100}>
            <iframe src={mapSrc} title={t("find.mapTitle")} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </Reveal>
        </div>
      </section>

      {/* 5 — Other ways forward */}
      <section className="ab-section ct-next">
        <div className="wrap ct-next-grid">
          <Reveal className="ct-next-card ct-next-card--dark">
            <h3>{t("next.bookTitle")}</h3>
            <p>{t("next.bookText")}</p>
            <Link href="/camp" className="ab-btn ab-btn--light">
              {t("next.bookCta")} <span aria-hidden="true">→</span>
            </Link>
          </Reveal>
          <Reveal className="ct-next-card" delay={100}>
            <h3>{t("next.faqTitle")}</h3>
            <p>{t("next.faqText")}</p>
            <Link href="/faq" className="ab-link">
              {t("next.faqCta")} <span aria-hidden="true">→</span>
            </Link>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
