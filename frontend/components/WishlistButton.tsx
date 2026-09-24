"use client";

import { useTranslations } from "next-intl";
import { useToast } from "@/components/Toast";
import { toggleFavorite, useFavoriteKeys, type FavoriteKind } from "@/lib/favorites";

/**
 * Heart on a card or a detail page. The list is per browser and, for a
 * logged-in customer, also saved to their account — see lib/favorites.ts.
 */
export default function WishlistButton({
  slug,
  kind = "tour",
  variant = "card",
}: {
  slug: string;
  /** What the slug belongs to; a circuit unless told otherwise. */
  kind?: FavoriteKind;
  /** "card" = absolute-positioned corner heart (grid/carousel cards).
   *  "inline" = static button with a text label (detail-page header row). */
  variant?: "card" | "inline";
}) {
  const t = useTranslations("tourCard");
  const toast = useToast();
  const keys = useFavoriteKeys();
  const saved = keys.includes(`${kind}:${slug}`);
  const label = saved ? t("removeFromWishlist") : t("addToWishlist");

  return (
    <button
      type="button"
      className={variant === "inline" ? "wishlist-btn-inline" : "wishlist-btn"}
      aria-pressed={saved}
      aria-label={label}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const nowSaved = toggleFavorite(kind, slug);
        toast.success(nowSaved ? t("wishlistAdded") : t("wishlistRemoved"));
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
      </svg>
      {variant === "inline" && <span>{label}</span>}
    </button>
  );
}
