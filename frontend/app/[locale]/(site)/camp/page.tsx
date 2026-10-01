import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getSiteImages, getStays } from "@/lib/api";
import type { Stay } from "@/lib/types";
import StayCard from "@/components/StayCard";
import CircuitsFilterBar, { type CircuitsSort } from "@/components/CircuitsFilterBar";
import PageHead from "@/components/PageHead";
import Reveal from "@/components/Reveal";
import CTA from "@/components/CTA";
import { localeAlternates, localeHref } from "@/i18n/routing";
import ListingPagination from "@/components/ListingPagination";
import { paginate, pageNumber } from "@/lib/pagination";

function applyFilters(items: Stay[], q: string | undefined, sort: string | undefined): Stay[] {
  let result = items;

  const needle = q?.trim().toLowerCase();
  if (needle) {
    result = result.filter((s) =>
      [s.title, s.description, s.kicker ?? ""].some((field) => field.toLowerCase().includes(needle)),
    );
  }

  if (sort === "price_asc") result = [...result].sort((a, b) => a.priceFrom - b.priceFrom);
  if (sort === "price_desc") result = [...result].sort((a, b) => b.priceFrom - a.priceFrom);

  return result;
}

const STAY_SORTS: CircuitsSort[] = ["price_asc", "price_desc"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.camp" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: localeAlternates(locale, (l) => localeHref(l, "/camp")),
  };
}

/**
 * Same page structure as /circuits: header, search + sort bar, a grid of
 * `edit-card` cards, and a closing contact banner.
 */
export default async function CampPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; sort?: string; page?: string }>;
}) {
  const { locale } = await params;
  const { q, sort, page } = await searchParams;
  const [allStays, t, tCta, images] = await Promise.all([
    getStays(locale),
    getTranslations("campPage"),
    getTranslations("ctaCamp"),
    getSiteImages(),
  ]);
  const stays = applyFilters(allStays, q, sort);
  const paged = paginate(stays, pageNumber(page));
  const isFiltered = !!q || !!sort;

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
        image={images["pagehead.camp"]}
      />

      <section className="block activities" style={{ paddingTop: 110 }}>
        <div className="wrap">
          {allStays.length > 0 && (
            <CircuitsFilterBar resultCount={stays.length} namespace="campPage" sorts={STAY_SORTS} />
          )}
          {stays.length > 0 ? (
            <div className="cards cols-2">
              {paged.items.map((stay, i) => (
                <Reveal key={stay.slug} delay={i * 90}>
                  <StayCard stay={stay} />
                </Reveal>
              ))}
            </div>
          ) : (
            <Reveal>
              <p className="lead">{isFiltered ? t("noResults") : ""}</p>
            </Reveal>
          )}
          <ListingPagination
            pathname="/camp"
            currentPage={paged.currentPage}
            totalPages={paged.totalPages}
            query={{ q, sort }}
          />
        </div>
      </section>

      <CTA title={tCta("title")} body={tCta("body")} href="/contact" label={tCta("label")} />
    </>
  );
}
