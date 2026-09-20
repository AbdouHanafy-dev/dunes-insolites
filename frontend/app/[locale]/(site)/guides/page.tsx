import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing, localeHref, localeAlternates } from "@/i18n/routing";
import { breadcrumbJsonLd } from "@/lib/schema";
import { getGuidePages } from "@/lib/api";
import { GUIDE_SLUGS } from "@/lib/guides";

// Now translated into all 6 locales - was FR/EN-only when this page first shipped.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.guides" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: localeAlternates(locale, (l) => localeHref(l, "/guides")),
  };
}

export default async function GuidesIndexPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  const availableSeedGuides = GUIDE_SLUGS.filter(
    (guide) => !("locales" in guide) || guide.locales.includes(locale as "fr" | "en"),
  );
  const [t, cmsPages, tNav, ...guideTs] = await Promise.all([
    getTranslations("guidesPage"),
    getGuidePages(locale),
    getTranslations("nav"),
    ...availableSeedGuides.map((g) => getTranslations(g.namespace)),
  ]);

  const breadcrumbItems = [
    { name: tNav("home"), path: localeHref(locale, "/") },
    { name: t("eyebrow"), path: localeHref(locale, "/guides") },
  ];
  const breadcrumbLd = breadcrumbJsonLd(breadcrumbItems);

  // Admin-authored articles (any slug, including a brand-new one no
  // frontend code knows about) plus the two seed articles - a CMS page
  // wins over a seed one that happens to share the same slug, same
  // "published content overrides the fallback" rule as every other CMS
  // page on this site.
  const cmsSlugs = new Set(cmsPages.map((p) => p.slug));
  const seedGuides = availableSeedGuides
    .map((guide, i) => ({
      slug: guide.slug,
      title: guideTs[i]("title"),
      lead: guideTs[i]("lead"),
      image: guide.image,
    }))
    .filter((g) => !cmsSlugs.has(g.slug));
  const allGuides = [
    ...cmsPages.map((p) => ({
      slug: p.slug,
      title: p.title,
      lead: p.metaDescription ?? "",
      image: p.ogImageUrl || "/images/gate.jpg",
    })),
    ...seedGuides,
  ];

  return (
    <main className="articles-index-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <header className="articles-index-head wrap">
        <p>{t("eyebrow")}</p>
        <h1>{t("title")}</h1>
        <div>
          <p>{t("lead")}</p>
          <span>{String(allGuides.length).padStart(2, "0")} · {t("publishedArticles")}</span>
        </div>
      </header>

      <section className="articles-index-list wrap" aria-label={t("title")}>
        {allGuides.map((guide, index) => (
          <article className={`article-card${index === 0 ? " article-card-featured" : ""}`} key={guide.slug}>
            <Link className="article-card-media" href={`/guides/${guide.slug}`} tabIndex={-1} aria-hidden="true">
              <Image src={guide.image} alt="" fill sizes={index === 0 ? "(max-width: 800px) 100vw, 65vw" : "(max-width: 800px) 100vw, 42vw"} />
            </Link>
            <div className="article-card-copy">
              <p><span>{String(index + 1).padStart(2, "0")}</span>{t("fieldNotes")}</p>
              <h2><Link href={`/guides/${guide.slug}`}>{guide.title}</Link></h2>
              <p>{guide.lead}</p>
              <Link className="article-card-read" href={`/guides/${guide.slug}`}>{t("readArticle")} <span aria-hidden="true">→</span></Link>
            </div>
          </article>
        ))}
      </section>

      <section className="articles-index-bottom">
        <div className="wrap">
          <p>{t("needAnswer")}</p>
          <Link href="/faq">{t("openFaq")} →</Link>
        </div>
      </section>
    </main>
  );
}
