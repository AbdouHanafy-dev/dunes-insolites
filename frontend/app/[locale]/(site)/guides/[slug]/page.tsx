import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import PageHead from "@/components/PageHead";
import Reveal from "@/components/Reveal";
import CTA from "@/components/CTA";
import CmsBlocks from "@/components/CmsBlocks";
import { Link } from "@/i18n/navigation";
import { routing, localeHref, localeAlternates } from "@/i18n/routing";
import { breadcrumbJsonLd } from "@/lib/schema";
import { getCmsPage } from "@/lib/api";
import { GUIDE_SLUGS } from "@/lib/guides";

// A published admin-authored Page with category=GUIDE and this exact slug
// (any company/locale combination the admin creates - see PageCategory's
// own comment) takes over this route entirely, same "CMS first, hardcoded
// fallback" pattern as about/safety/contact (ARCHITECTURE.md §10.6). The
// two seed articles in lib/guides.ts are what render when nothing's been
// published for that slug - so the site never blanks a route just because
// an editor hasn't touched it yet, and a genuinely new article slug the
// admin creates (not one of these two) needs no frontend code change at
// all to go live.
type Props = { params: Promise<{ locale: string; slug: string }> };

export function generateStaticParams() {
  return GUIDE_SLUGS.flatMap((g) => routing.locales.map((locale) => ({ locale, slug: g.slug })));
}

// dynamicParams stays at its default (true): an admin-created article
// whose slug isn't one of the two above still renders on demand instead
// of 404ing, since generateStaticParams above only knows about the seed
// two at build time.

function findGuide(slug: string) {
  return GUIDE_SLUGS.find((g) => g.slug === slug);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const cms = await getCmsPage(slug, locale);
  const alternates = localeAlternates(locale, (l) => localeHref(l, `/guides/${slug}`));

  if (cms) {
    return {
      title: cms.seoTitle || cms.title,
      description: cms.metaDescription || undefined,
      alternates,
      robots: cms.noIndex || cms.noFollow
        ? { index: !cms.noIndex, follow: !cms.noFollow }
        : undefined,
    };
  }

  const guide = findGuide(slug);
  if (!guide) return { title: "Not found" };
  const t = await getTranslations({ locale, namespace: guide.metaNamespace });
  return { title: t("title"), description: t("description"), alternates };
}

export default async function GuideDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  const cms = await getCmsPage(slug, locale);

  if (cms && cms.blocks.length > 0) {
    const breadcrumbLd = breadcrumbJsonLd([
      { name: "Home", path: localeHref(locale, "/") },
      { name: "Guides", path: localeHref(locale, "/guides") },
      { name: cms.title, path: localeHref(locale, `/guides/${slug}`) },
    ]);
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
        />
        <PageHead eyebrow="Guide" title={cms.title} lead="" image="/images/gate.jpg" />
        <section className="section-sand">
          <div className="wrap">
            <CmsBlocks blocks={cms.blocks} />
          </div>
        </section>
        <CTA />
      </>
    );
  }

  const guide = findGuide(slug);
  if (!guide) notFound();

  const t = await getTranslations(guide.namespace);

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", path: localeHref(locale, "/") },
    { name: "Guides", path: localeHref(locale, "/guides") },
    { name: t("title"), path: localeHref(locale, `/guides/${slug}`) },
  ]);

  const isSahara = slug === "desert-sabria-tunisie";

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <PageHead
        eyebrow={t("eyebrow")}
        title={t("title")}
        lead={t("lead")}
        image={isSahara ? "/images/gate.jpg" : "/images/camel.jpg"}
      />

      <section className="section-sand">
        <div className="wrap">
          {isSahara ? (
            <Reveal className="prose">
              <h2>{t("whereHeading")}</h2>
              <p>{t("whereP1")}</p>
              <p>{t("whereP2")}</p>

              <h2>{t("whenHeading")}</h2>
              <p>{t("whenP1")}</p>
              <p>{t("whenP2")}</p>

              <h2>{t("whatHeading")}</h2>
              <p>{t("whatP1")}</p>
              <p>{t("whatP2")}</p>

              <h2>{t("practicalHeading")}</h2>
              <p>{t("practicalP1")}</p>
              <p>{t("practicalP2")}</p>

              <h2>{t("linksHeading")}</h2>
              <ul>
                <li>
                  <Link href="/camp">{t("ctaStay")}</Link>
                </li>
                <li>
                  <Link href="/activities">{t("ctaActivities")}</Link>
                </li>
                <li>
                  <Link href="/guides/que-faut-il-emporter-desert">{t("ctaPacking")}</Link>
                </li>
                <li>
                  <Link href="/faq">{t("ctaFaq")}</Link>
                </li>
              </ul>
            </Reveal>
          ) : (
            <Reveal className="prose">
              <h2>{t("dayHeading")}</h2>
              <p>{t("dayP1")}</p>
              <p>{t("dayP2")}</p>

              <h2>{t("nightHeading")}</h2>
              <p>{t("nightP1")}</p>

              <h2>{t("providedHeading")}</h2>
              <p>{t("providedP1")}</p>

              <h2>{t("medHeading")}</h2>
              <p>{t("medP1")}</p>

              <h2>{t("linksHeading")}</h2>
              <ul>
                <li>
                  <Link href="/guides/desert-sabria-tunisie">{t("ctaSahara")}</Link>
                </li>
                <li>
                  <Link href="/safety">{t("ctaSafety")}</Link>
                </li>
                <li>
                  <Link href="/book">{t("ctaBook")}</Link>
                </li>
              </ul>
            </Reveal>
          )}
        </div>
      </section>

      <CTA />
    </>
  );
}
