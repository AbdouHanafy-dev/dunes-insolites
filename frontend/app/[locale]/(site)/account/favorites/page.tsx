import { getTranslations } from "next-intl/server";
import { getFavoritesCatalog } from "@/lib/favoritesCatalog";
import FavoritesView from "@/components/FavoritesView";

/** "Mes favoris" inside the customer's space (the account layout already requires a session). */
export default async function AccountFavoritesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const [t, catalog] = await Promise.all([getTranslations("favorites"), getFavoritesCatalog(locale)]);

  return (
    <div className="book-card">
      <h2>{t("title")}</h2>
      <p className="hint">{t("accountLead")}</p>
      <div style={{ marginTop: 28 }}>
        <FavoritesView catalog={catalog} loggedIn />
      </div>
    </div>
  );
}
