import Link from "next/link";

/**
 * Visible breadcrumb trail — the site already emitted BreadcrumbList
 * JSON-LD everywhere (lib/schema.ts's breadcrumbJsonLd, used on 9+ pages)
 * for Google's rich-result display, but nothing rendered on the page
 * itself (SEO audit, 15 Sep 2026). That's a real gap: on-page breadcrumbs
 * are both a usability aid and internal-linking signal that structured
 * data alone doesn't provide.
 *
 * Takes the exact same `{ name, path }[]` shape as breadcrumbJsonLd so a
 * page computes its trail once and feeds both — `path` is already
 * locale-prefixed (localeHref), so this uses a plain next/link rather
 * than next-intl's Link, which would double-prefix it.
 */
export default function Breadcrumbs({ items }: { items: { name: string; path: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="breadcrumbs">
      <ol>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.path}>
              {isLast ? (
                <span aria-current="page">{item.name}</span>
              ) : (
                <Link href={item.path}>{item.name}</Link>
              )}
              {!isLast && (
                <span className="sep" aria-hidden="true">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
