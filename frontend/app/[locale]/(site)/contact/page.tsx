import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import ContactForm from "@/components/ContactForm";
import PageHead from "@/components/PageHead";
import LivePreview from "@/components/LivePreview";
import { getCmsPage, getSiteSettings } from "@/lib/api";
import { localeAlternates, localeHref } from "@/i18n/routing";
import { breadcrumbJsonLd } from "@/lib/schema";

const CMS_SLUG = "contact";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const [t, cms] = await Promise.all([
    getTranslations({ locale, namespace: "meta.contact" }),
    getCmsPage(CMS_SLUG, locale),
  ]);
  return {
    title: cms?.seoTitle || t("title"),
    description: cms?.metaDescription || t("description"),
    alternates: localeAlternates(locale, (l) => localeHref(l, "/contact")),
  };
}

function buildMapSrc(lat: number, lng: number): string {
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.08}%2C${
    lat - 0.06
  }%2C${lng + 0.08}%2C${lat + 0.06}&layer=mapnik&marker=${lat}%2C${lng}`;
}

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ livePreview?: string }>;
}) {
  const { livePreview } = await searchParams;

  if (livePreview === "1") {
    const t = await getTranslations("contact");
    return <LivePreview eyebrow={t("eyebrow")} />;
  }

  const locale = await getLocale();
  const [t, cms, tNav, settings] = await Promise.all([
    getTranslations("contact"),
    getCmsPage(CMS_SLUG, locale),
    getTranslations("nav"),
    getSiteSettings(),
  ]);
  const mapSrc = buildMapSrc(settings.coords.lat, settings.coords.lng);

  // Only the header reads from the CMS here — the form, info cards and map
  // are real functionality, not editorial content, and were never going to
  // become CMS blocks (see ARCHITECTURE.md §10.6). A published "contact"
  // page's hero block can override the title/lead; its eyebrow always comes
  // from the translated default, since "hero" has no eyebrow field. With
  // no CMS page published (true today), this is byte-for-byte what it was
  // before this section existed.
  const heroBlock = cms?.blocks.find((b) => b.type === "hero");
  const heroData = heroBlock?.data ?? {};
  const title = (typeof heroData.title === "string" && heroData.title) || t("title");
  const lead = (typeof heroData.subtitle === "string" && heroData.subtitle) || t("lead");

  const breadcrumbItems = [
    { name: tNav("home"), path: localeHref(locale, "/") },
    { name: t("eyebrow"), path: localeHref(locale, "/contact") },
  ];
  const breadcrumbLd = breadcrumbJsonLd(breadcrumbItems);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <PageHead eyebrow={t("eyebrow")} title={title} lead={lead} image="/images/sandboard.jpg" />

      <section className="section-sand">
        <div className="wrap">
          <div className="contact-grid">
            <div>
              <ContactForm />
            </div>

            <aside>
              <div className="info-list">
                <div>
                  <div className="k">{t("emailLabel")}</div>
                  <div className="v">
                    <a href={`mailto:${settings.email}`}>{settings.email}</a>
                  </div>
                </div>
                <div>
                  <div className="k">{t("phoneLabel")}</div>
                  <div className="v">
                    <a href={`tel:${settings.phone.replace(/\s/g, "")}`}>{settings.phone}</a>
                  </div>
                </div>
                <div>
                  <div className="k">{t("gateLabel")}</div>
                  <div className="v">{settings.address}</div>
                </div>
                <div>
                  <div className="k">{t("deskHoursLabel")}</div>
                  <div className="v">{t("deskHoursValue")}</div>
                </div>
              </div>

              <div className="map-frame">
                <iframe
                  src={mapSrc}
                  title="Map showing Sabria, southern Tunisia"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
