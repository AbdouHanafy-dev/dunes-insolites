import type { Metadata } from "next";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getStay } from "@/lib/api";
import { getStays } from "@/lib/data/stays";
import { breadcrumbJsonLd } from "@/lib/schema";
import { localeHref, localeAlternates } from "@/i18n/routing";
import { isDisplayableImageSrc } from "@/lib/imageSrc";

type Props = { params: Promise<{ locale: string; slug: string; accommodation: string }> };

async function getAccommodation(params: Props["params"]) {
  const { locale, slug, accommodation: accommodationSlug } = await params;
  const stay = await getStay(slug, locale);
  const accommodation = stay?.accommodations?.find((item) => item.slug === accommodationSlug);
  return { stay, accommodation };
}

export function generateStaticParams() {
  return getStays().flatMap((stay) =>
    (stay.accommodations ?? []).map((accommodation) => ({ slug: stay.slug, accommodation: accommodation.slug })),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const { stay, accommodation } = await getAccommodation(params);
  if (!stay || !accommodation) return { title: "Not found" };
  return {
    title: `${accommodation.title} at ${stay.title}`,
    description: accommodation.description,
    alternates: localeAlternates(locale, (l) => localeHref(l, `/camp/${stay.slug}/${accommodation.slug}`)),
    openGraph: isDisplayableImageSrc(accommodation.image)
      ? { images: [{ url: accommodation.image, width: 1200, height: 630, alt: accommodation.title }] }
      : undefined,
  };
}

export default async function AccommodationDetail({ params }: Props) {
  const { locale } = await params;
  const [{ stay, accommodation }, t, tNav] = await Promise.all([
    getAccommodation(params),
    getTranslations("accommodationPage"),
    getTranslations("nav"),
  ]);
  if (!stay || !accommodation) notFound();

  const breadcrumbItems = [
    { name: tNav("home"), path: localeHref(locale, "/") },
    { name: tNav("stay"), path: localeHref(locale, "/camp") },
    { name: stay.title, path: localeHref(locale, `/camp/${stay.slug}`) },
    { name: accommodation.title, path: localeHref(locale, `/camp/${stay.slug}/${accommodation.slug}`) },
  ];
  const breadcrumbLd = breadcrumbJsonLd(breadcrumbItems);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <section className="accommodation-hero">
        {isDisplayableImageSrc(accommodation.image) && (
          <Image src={accommodation.image} alt={accommodation.title} fill sizes="100vw" preload style={{ objectFit: "cover" }} />
        )}
        <div className="wrap">
          <Link href={`/camp/${stay.slug}`} className="back-link">{t("backTo", { stay: stay.title })}</Link>
          <p className="kicker">{t("kicker")}</p>
          <h1>{accommodation.title}</h1>
          <p>{accommodation.tagline}</p>
        </div>
      </section>
      <section className="detail-body">
        <div className="wrap">
          <div className="prose accommodation-detail-copy" style={{ maxWidth: 720, margin: "0 auto" }}>
            <p className="sect-eyebrow">{t("theDetails")}</p>
            <h2>{t("nightThatFits")}</h2>
            <p>{accommodation.description}</p>
            <ul className="feature-list">
              {accommodation.features.map((feature) => <li key={feature}>{feature}</li>)}
            </ul>
            <p style={{ marginTop: 32 }}>
              <strong>{t("perNight", { price: accommodation.priceFrom, sleeps: accommodation.sleeps })}</strong>
            </p>
          </div>
          <div style={{ maxWidth: 720, margin: "24px auto 0", textAlign: "center" }}>
            <Link
              href={`/camp/${stay.slug}?accommodation=${accommodation.slug}#reserve`}
              className="btn-accent"
            >
              {t("reserveThisStay")}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
