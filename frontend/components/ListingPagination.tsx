import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

function pageHref(
  pathname: string,
  page: number,
  query: Record<string, string | undefined>,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value);
  }
  if (page > 1) params.set("page", String(page));
  const suffix = params.toString();
  return suffix ? `${pathname}?${suffix}` : pathname;
}

export default function ListingPagination({
  pathname,
  currentPage,
  totalPages,
  query = {},
}: {
  pathname: string;
  currentPage: number;
  totalPages: number;
  query?: Record<string, string | undefined>;
}) {
  const t = useTranslations("pagination");
  if (totalPages <= 1) return null;

  return (
    <nav className="listing-pagination" aria-label={t("ariaLabel")}>
      {currentPage > 1 ? (
        <Link rel="prev" href={pageHref(pathname, currentPage - 1, query)}>
          <span aria-hidden="true">&larr;</span> {t("previous")}
        </Link>
      ) : (
        <span aria-disabled="true"><span aria-hidden="true">&larr;</span> {t("previous")}</span>
      )}
      <strong>{t("status", { current: currentPage, total: totalPages })}</strong>
      {currentPage < totalPages ? (
        <Link rel="next" href={pageHref(pathname, currentPage + 1, query)}>
          {t("next")} <span aria-hidden="true">&rarr;</span>
        </Link>
      ) : (
        <span aria-disabled="true">{t("next")} <span aria-hidden="true">&rarr;</span></span>
      )}
    </nav>
  );
}
