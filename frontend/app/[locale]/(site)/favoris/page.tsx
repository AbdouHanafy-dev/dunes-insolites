import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getSiteImages } from "@/lib/api";
import { getSession } from "@/lib/session";
import { getFavoritesCatalog } from "@/lib/favoritesCatalog";
import { localeAlternates, localeHref } from "@/i18n/routing";
import FavoritesView from "@/components/FavoritesView";
import PageHead from "@/components/PageHead";

// Depends on who is asking (guest list vs account), so never served from the route cache.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "favorites" });
  return {
    title: t("title"),
    // A personal list: nothing here for search engines to index.
    robots: { index: false },
    alternates: localeAlternates(locale, (l) => localeHref(l, "/favoris")),
  };
}

export default async function FavoritesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const [t, session, catalog, images] = await Promise.all([
    getTranslations("favorites"),
    getSession(),
    getFavoritesCatalog(locale),
    getSiteImages(),
  ]);

  return (
    <>
      <PageHead eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} image={images["pagehead.activities"]} />
      <section className="block activities" style={{ paddingTop: 110 }}>
        <div className="wrap">
          <FavoritesView catalog={catalog} loggedIn={!!session} />
        </div>
      </section>
    </>
  );
}
