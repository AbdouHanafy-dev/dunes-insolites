import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import ContactForm from "@/components/ContactForm";
import PageHead from "@/components/PageHead";
import { site } from "@/lib/site";
import { localeAlternates, localeHref } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Contact",
    description:
      "Get in touch with Dunes Insolites in Sabria, southern Tunisia — questions, private groups, and custom desert itineraries.",
    alternates: localeAlternates(locale, (l) => localeHref(l, "/contact")),
  };
}

const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${
  site.coords.lng - 0.08
}%2C${site.coords.lat - 0.06}%2C${site.coords.lng + 0.08}%2C${
  site.coords.lat + 0.06
}&layer=mapnik&marker=${site.coords.lat}%2C${site.coords.lng}`;

export default async function ContactPage() {
  const t = await getTranslations("contact");

  return (
    <>
      <PageHead eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} image="/images/sandboard.jpg" />

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
                    <a href={`mailto:${site.email}`}>{site.email}</a>
                  </div>
                </div>
                <div>
                  <div className="k">{t("phoneLabel")}</div>
                  <div className="v">
                    <a href={`tel:${site.phone.replace(/\s/g, "")}`}>{site.phone}</a>
                  </div>
                </div>
                <div>
                  <div className="k">{t("gateLabel")}</div>
                  <div className="v">{site.address}</div>
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
