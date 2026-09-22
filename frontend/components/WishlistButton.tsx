"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/Toast";

const STORAGE_KEY = "wishlist";
const CHANGE_EVENT = "wishlist:change";

function readWishlist(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function writeWishlist(slugs: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...slugs]));
  } catch {
    // Private window / blocked storage - the toggle still works for this
    // render, it just won't persist. Not worth surfacing an error for a
    // per-viewer convenience.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * Per-browser "save for later" heart, same convenience-only role as any
 * other localStorage read in this app — never synced, never read
 * server-side, never authoritative. `useSyncExternalStore` (not
 * useState+useEffect) so the server snapshot is always "unsaved" and the
 * client one reads localStorage — no cascading-render setState-in-effect,
 * and every WishlistButton on the page re-renders in sync when any one of
 * them is toggled.
 */
export default function WishlistButton({
  slug,
  variant = "card",
}: {
  slug: string;
  /** "card" = absolute-positioned corner heart (grid/carousel cards).
   *  "inline" = static button with a text label (detail-page header row). */
  variant?: "card" | "inline";
}) {
  const t = useTranslations("tourCard");
  const toast = useToast();
  const saved = useSyncExternalStore(
    subscribe,
    () => readWishlist().has(slug),
    () => false,
  );
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
        const current = readWishlist();
        if (current.has(slug)) {
          current.delete(slug);
          toast.success(t("wishlistRemoved"));
        } else {
          current.add(slug);
          toast.success(t("wishlistAdded"));
        }
        writeWishlist(current);
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
      </svg>
      {variant === "inline" && <span>{label}</span>}
    </button>
  );
}
