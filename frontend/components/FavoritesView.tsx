"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import WishlistButton from "@/components/WishlistButton";
import { useFavoriteKeys } from "@/lib/favorites";
import type { FavoriteCatalogItem } from "@/lib/favoritesCatalog";

/**
 * The saved items. Guests see the list kept in their browser; a logged-in
 * customer sees the one saved to their account (the header syncs it on every
 * page). Same card as the circuits list, with the heart to remove an item.
 */
export default function FavoritesView({
  catalog,
  loggedIn,
}: {
  catalog: FavoriteCatalogItem[];
  loggedIn: boolean;
}) {
  const t = useTranslations("favorites");
  const keys = useFavoriteKeys();

  // Newest first: the local list is oldest first.
  const byKey = new Map(catalog.map((item) => [`${item.kind}:${item.slug}`, item]));
  const items = [...keys].reverse().map((key) => byKey.get(key)).filter((i): i is FavoriteCatalogItem => !!i);

  return (
    <div className="favorites-view">
      {!loggedIn && (
        <p className="favorites-note">
          {t("guestNote")}{" "}
          <Link href="/login" className="favorites-note-link">
            {t("logIn")}
          </Link>
        </p>
      )}

      {items.length === 0 ? (
        <div className="favorites-empty">
          <p>{t("empty")}</p>
          <div className="favorites-empty-links">
            <Link href="/camp" className="btn-accent">{t("browseStays")}</Link>
            <Link href="/activities" className="editorial-link">{t("browseActivities")}</Link>
            <Link href="/circuits" className="editorial-link">{t("browseCircuits")}</Link>
          </div>
        </div>
      ) : (
        <>
          <p className="favorites-count">{t("count", { count: items.length })}</p>
          <div className="cards">
            {items.map((item) => (
              <Link key={`${item.kind}:${item.slug}`} className="edit-card" href={item.href}>
                <span className="edit-card-media">
                  <WishlistButton slug={item.slug} kind={item.kind} />
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    sizes="(max-width: 900px) 100vw, 33vw"
                    style={{ objectFit: "cover" }}
                  />
                </span>
                <span className="edit-card-cap">
                  <span className="idx-label">
                    {t(`kind.${item.kind}`)} · {item.kicker}
                  </span>
                  <span className="edit-card-title">{item.title}</span>
                  <span className="edit-card-meta">
                    <span className="edit-card-price">{t("fromPrice", { price: item.priceFrom })}</span>
                  </span>
                  <span className="edit-card-arrow" aria-hidden="true">
                    →
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
