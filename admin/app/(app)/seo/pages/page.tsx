import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { getAllPages } from "@/lib/api";
import { seoChecks } from "@/lib/seo";

export const metadata: Metadata = { title: "Pages SEO" };

const LOCALE_FLAG: Record<string, string> = {
  FR: "🇫🇷",
  EN: "🇬🇧",
  DE: "🇩🇪",
  IT: "🇮🇹",
  DA: "🇩🇰",
  AR: "🇸🇦",
};

export default async function PagesSeoOverviewPage() {
  const session = await getSession();
  if (!session) return null;

  const pages = await getAllPages(session.accessToken);
  const rows = pages
    .map((p) => ({
      page: p,
      checks: seoChecks(p, p.title),
    }))
    .sort((a, b) => a.page.slug.localeCompare(b.page.slug) || a.page.locale.localeCompare(b.page.locale));

  const totalErrors = rows.reduce(
    (n, r) => n + r.checks.filter((c) => c.level === "error").length,
    0,
  );
  const totalWarnings = rows.reduce(
    (n, r) => n + r.checks.filter((c) => c.level === "warn").length,
    0,
  );

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-navy-800">Pages SEO</h1>
        <p className="mt-1 text-sm text-navy-700/55">
          {pages.length} page(s) · {totalErrors} problème(s) bloquant(s) · {totalWarnings} avertissement(s)
          — mêmes vérifications que l&apos;onglet SEO de chaque page, pas un score inventé.
        </p>
      </div>

      <div className="card overflow-hidden rounded-2xl">
        {rows.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-gray-400">Aucune page pour le moment.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400">
                  <th className="px-6 py-3 font-medium">Page</th>
                  <th className="px-6 py-3 font-medium">Langue</th>
                  <th className="px-6 py-3 font-medium">Statut</th>
                  <th className="px-6 py-3 font-medium">Titre SEO</th>
                  <th className="px-6 py-3 font-medium">Méta-description</th>
                  <th className="px-6 py-3 font-medium">Vérifications</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map(({ page, checks }) => {
                  const errors = checks.filter((c) => c.level === "error").length;
                  const warns = checks.filter((c) => c.level === "warn").length;
                  return (
                    <tr key={page.pageId} className="hover:bg-gray-50">
                      <td className="px-6 py-3">
                        <Link
                          href={`/content/pages/${page.pageId}`}
                          className="font-medium text-navy-800 hover:underline"
                        >
                          {page.title}
                        </Link>
                        <div className="text-xs text-gray-400">/{page.slug}</div>
                      </td>
                      <td className="px-6 py-3 text-gray-700">
                        {LOCALE_FLAG[page.locale] ?? ""} {page.locale}
                      </td>
                      <td className="px-6 py-3 text-gray-700">
                        {page.status === "PUBLISHED" ? "Publiée" : "Brouillon"}
                      </td>
                      <td className="px-6 py-3 text-gray-700">
                        {page.seoTitle ? "✓" : <span className="text-rose">✗ manquant</span>}
                      </td>
                      <td className="px-6 py-3 text-gray-700">
                        {page.metaDescription ? "✓" : <span className="text-rose">✗ manquante</span>}
                      </td>
                      <td className="px-6 py-3">
                        {errors === 0 && warns === 0 ? (
                          <span className="text-emerald">✓ tout est bon</span>
                        ) : (
                          <span>
                            {errors > 0 && <span className="text-rose">{errors} erreur(s) </span>}
                            {warns > 0 && <span className="text-gold-dark">{warns} avertissement(s)</span>}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
