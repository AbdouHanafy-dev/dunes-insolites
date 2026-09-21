"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export type CircuitsSort = "price_asc" | "price_desc" | "duration_asc" | "duration_desc";

const SORT_VALUES: CircuitsSort[] = ["price_asc", "price_desc", "duration_asc", "duration_desc"];

/**
 * Server-rendered results (CircuitsPage filters/sorts `tours` itself from
 * the URL's `q`/`sort` params) with a client-side control bar that just
 * updates the URL — no client-side data fetching or state duplication, so
 * the results stay SSR'd and shareable/bookmarkable as a link.
 */
export default function CircuitsFilterBar({ resultCount }: { resultCount: number }) {
  const t = useTranslations("circuitsPage");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const sort = searchParams.get("sort") ?? "";

  function pushParams(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  const hasFilters = !!searchParams.get("q") || !!searchParams.get("sort");

  return (
    <div className="circuits-filter-bar">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          pushParams({ q: query.trim() });
        }}
      >
        <label className="sr-only" htmlFor="circuits-search">
          {t("searchLabel")}
        </label>
        <input
          id="circuits-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onBlur={() => pushParams({ q: query.trim() })}
          placeholder={t("searchPlaceholder")}
        />
      </form>

      <label className="circuits-sort">
        <span className="sr-only">{t("sortLabel")}</span>
        <select
          value={sort}
          onChange={(e) => pushParams({ sort: e.target.value })}
          aria-label={t("sortLabel")}
        >
          <option value="">{t("sortDefault")}</option>
          {SORT_VALUES.map((value) => (
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
      </label>

      {hasFilters && (
        <button
          type="button"
          className="circuits-filter-reset"
          onClick={() => {
            setQuery("");
            startTransition(() => router.replace(pathname));
          }}
        >
          {t("resetFilters")}
        </button>
      )}

      <span className="circuits-result-count" aria-live="polite" style={{ opacity: isPending ? 0.5 : 1 }}>
        {resultCount}
      </span>
    </div>
  );
}
