import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import PageHead from "@/components/PageHead";
import Reveal from "@/components/Reveal";
import Experience from "@/components/Experience";
import CTA from "@/components/CTA";
import { localeAlternates, localeHref } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.about" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: localeAlternates(locale, (l) => localeHref(l, "/about")),
  };
}

export default async function AboutPage() {
  const t = await getTranslations("about");

  const guides = [
    { name: "Hédi Ben Amor", role: t("guide1Role"), photo: "/images/camel.jpg", bio: t("guide1Bio") },
    { name: "Yasmine Trabelsi", role: t("guide2Role"), photo: "/images/quad.jpg", bio: t("guide2Bio") },
    { name: "Karim Saïdi", role: t("guide3Role"), photo: "/images/sandboard.jpg", bio: t("guide3Bio") },
  ];

  return (
    <>
      <PageHead
        eyebrow={t("eyebrow")}
        title={
          <>
            {t("titleLine1")}
            <br />
            {t("titleLine2")}
          </>
        }
        lead={t("lead")}
        image="/images/gate.jpg"
      />

      <section className="section-sand">
        <div className="wrap">
          <Reveal className="prose">
            <h2>{t("whyHeading")}</h2>
            <p>{t("whyP1")}</p>
            <p>{t("whyP2")}</p>

            <h2>{t("howHeading")}</h2>
            <ul>
              <li>{t("how1")}</li>
              <li>{t("how2")}</li>
              <li>{t("how3")}</li>
              <li>{t("how4")}</li>
              <li>{t("how5")}</li>
            </ul>
          </Reveal>

          <Reveal>
            <div id="guides" style={{ marginTop: 96, scrollMarginTop: 120 }}>
              <p className="sect-eyebrow">{t("guidesEyebrow")}</p>
              <h2 className="sect-title" style={{ fontSize: "clamp(30px,3.6vw,52px)" }}>
                {t("guidesHeading")}
              </h2>
              <div className="team">
                {guides.map((g) => (
                  <div key={g.name} className="member">
                    <div className="photo">
                      <Image
                        src={g.photo}
                        alt={g.name}
                        fill
                        sizes="(max-width: 900px) 50vw, 33vw"
                      />
                    </div>
                    <h3>{g.name}</h3>
                    <div className="role">{g.role}</div>
                    <p className="bio">{g.bio}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <Experience />
      <CTA />
    </>
  );
}
