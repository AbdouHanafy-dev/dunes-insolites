"use client";

import { useRef, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export type CircuitsSort = "price_asc" | "price_desc" | "duration_asc" | "duration_desc";

const SORT_VALUES: CircuitsSort[] = ["price_asc", "price_desc", "duration_asc", "duration_desc"];
const SEARCH_DELAY_MS = 350;

/**
 * The search and sort bar of every listing (circuits, camp, activities).
 * Results are rendered by the server from the URL's `q`/`sort` params; this
 * control only updates the URL, so the list stays server-rendered and a
 * filtered view is a shareable link. Typing searches after a short pause;
 * Enter searches at once.
 */
export default function CircuitsFilterBar({
  resultCount,
  namespace = "circuitsPage",
  sorts = SORT_VALUES,
}: {
  resultCount: number;
  /** Message namespace holding the search/sort labels (same keys as circuitsPage). */
  namespace?: string;
  /** Which sort options to offer; a listing without durations omits the duration ones. */
  sorts?: CircuitsSort[];
}) {
  const t = useTranslations(namespace);
  const tBar = useTranslations("filterBar");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const sort = searchParams.get("sort") ?? "";

  function pushParams(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  function onQueryChange(value: string) {
    setQuery(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => pushParams({ q: value.trim() }), SEARCH_DELAY_MS);
  }

  function searchNow(value: string) {
    clearTimeout(timer.current);
    pushParams({ q: value.trim() });
  }

  const hasFilters = !!searchParams.get("q") || !!searchParams.get("sort");

  return (
    <div className="lfb" data-pending={isPending || undefined}>
      <form
        className="lfb-search"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          searchNow(query);
        }}
      >
        <svg className="lfb-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" />
          <path d="m20 20-4-4" />
        </svg>
        <label className="sr-only" htmlFor="listing-search">
          {t("searchLabel")}
        </label>
        <input
          id="listing-search"
          type="text"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={t("searchPlaceholder")}
        />
        {query && (
          <button
            type="button"
            className="lfb-clear"
            aria-label={tBar("clearSearch")}
            onClick={() => {
              setQuery("");
              searchNow("");
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        )}
      </form>

      <label className="lfb-sort">
        <span className="lfb-sort-label">{t("sortLabel")}</span>
        <select value={sort} onChange={(e) => pushParams({ sort: e.target.value })} aria-label={t("sortLabel")}>
          <option value="">{t("sortDefault")}</option>
          {sorts.map((value) => (
            <option key={value} value={value}>
              {t(
                value === "price_asc"
                  ? "sortPriceAsc"
                  : value === "price_desc"
                    ? "sortPriceDesc"
                    : value === "duration_asc"
                      ? "sortDurationAsc"
                      : "sortDurationDesc",
              )}
            </option>
          ))}
        </select>
        <svg className="lfb-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </label>

      {hasFilters && (
        <button
          type="button"
          className="lfb-reset"
          onClick={() => {
            clearTimeout(timer.current);
            setQuery("");
            startTransition(() => router.replace(pathname, { scroll: false }));
          }}
        >
          {t("resetFilters")}
        </button>
      )}

      <span className="lfb-count" aria-live="polite">
        {tBar("resultCount", { count: resultCount })}
      </span>
    </div>
  );
}
