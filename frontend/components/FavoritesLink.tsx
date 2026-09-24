"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { setServerSync, syncOnLogin, useFavoriteKeys } from "@/lib/favorites";

/**
 * The heart in the header, with the number of saved items. For a logged-in
 * customer it also runs the login merge once (the browser's list joins the
 * account's) and keeps toggles synced to the account; the link then goes to
 * the list in their space instead of the public one.
 */
export default function FavoritesLink({ loggedIn, showLabel = false }: { loggedIn: boolean; showLabel?: boolean }) {
  const t = useTranslations("favorites");
  const count = useFavoriteKeys().length;

  useEffect(() => {
    if (loggedIn) void syncOnLogin();
    else setServerSync(false);
  }, [loggedIn]);

  const label = t("linkLabel");

  return (
    <Link
      className={showLabel ? "header-favorites header-favorites--row" : "header-favorites"}
      href={loggedIn ? "/account/favorites" : "/favoris"}
      aria-label={count > 0 ? t("linkWithCount", { count }) : label}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill={count > 0 ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
      </svg>
      {showLabel && <span>{label}</span>}
      {count > 0 && <span className="header-favorites-count">{count}</span>}
    </Link>
  );
}
