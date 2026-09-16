import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { getAllPages, type AdminPage } from "@/lib/api";
import { getSeoAudit } from "@/lib/seoAudit";
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

// frontend/i18n/routing.ts: fr is unprefixed, the rest live under /{locale}.
const NON_DEFAULT_LOCALES = ["EN", "DE", "IT", "DA", "AR"];

// The site's real pages aren't all rows in the `pages` CMS table — see
// frontend/app/[locale]/(site)/{about,safety,contact,legal/terms,
// legal/privacy}/page.tsx and guides/[slug]/page.tsx, the only routes that
// actually read a `Page` row (via CMS_SLUG). Every other real route (camp,
// activities, home, catalogue…) has no CMS row at all. This maps a live
// URL back to the `Page` it's rendered from, when there is one, so an
// editor can jump straight to it.
function localeAndCmsSlugFromPath(pathname: string): { locale: string; cmsSlug: string | null } {
  const segments = pathname.split("/").filter(Boolean);
  let locale = "FR";
  let rest = segments;
  if (segments.length > 0 && NON_DEFAULT_LOCALES.includes(segments[0].toUpperCase())) {
    locale = segments[0].toUpperCase();
    rest = segments.slice(1);
  }
  const path = "/" + rest.join("/");
  let cmsSlug: string | null = null;
  if (path === "/about") cmsSlug = "about";
  else if (path === "/safety") cmsSlug = "safety";
  else if (path === "/contact") cmsSlug = "contact";
  else if (path === "/legal/terms") cmsSlug = "legal-terms";
  else if (path === "/legal/privacy") cmsSlug = "legal-privacy";
  else if (rest[0] === "guides" && rest[1]) cmsSlug = rest[1];
  return { locale, cmsSlug };
}

const TITLE_MIN = 30;
const TITLE_MAX = 60;
const DESC_MIN = 70;
const DESC_MAX = 160;

type Problem = { level: "error" | "warn"; label: string };

// Same thresholds as admin/lib/seo.ts's seoChecks() and seo/audit/page.tsx
// - one convention for "good length", not several that could disagree.
function checksForCrawled(title: string | null, description: string | null): Problem[] {
  const problems: Problem[] = [];
  if (!title) {
    problems.push({ level: "error", label: "Titre manquant" });
  } else if (title.length < TITLE_MIN || title.length > TITLE_MAX) {
    problems.push({ level: "warn", label: `Titre : ${title.length} caractères (idéal ${TITLE_MIN}–${TITLE_MAX})` });
  }
  if (!description) {
    problems.push({ level: "error", label: "Méta-description manquante" });
  } else if (description.length < DESC_MIN || description.length > DESC_MAX) {
    problems.push({
      level: "warn",
      label: `Méta-description : ${description.length} caractères (idéal ${DESC_MIN}–${DESC_MAX})`,
    });
  }
  return problems;
}

type Row = {
  key: string;
  url: string | null;
  locale: string;
  statusLabel: "Publiée" | "En ligne" | "Brouillon";
  title: string | null;
  description: string | null;
  editHref: string | null;
  errors: number;
  warns: number;
};

export default async function PagesSeoOverviewPage() {
  const session = await getSession();
  if (!session) return null;

  const [pages, auditEntries] = await Promise.all([
    getAllPages(session.accessToken),
    getSeoAudit(),
  ]);

  const cmsBySlugLocale = new Map<string, AdminPage>();
  for (const p of pages) cmsBySlugLocale.set(`${p.locale}::${p.slug}`, p);

  const matchedPageIds = new Set<string>();
  const rows: Row[] = [];

  for (const entry of auditEntries) {
    let pathname: string;
    try {
      pathname = new URL(entry.loc).pathname;
    } catch {
      continue;
    }
    const { locale, cmsSlug } = localeAndCmsSlugFromPath(pathname);
    const cmsPage = cmsSlug ? cmsBySlugLocale.get(`${locale}::${cmsSlug}`) : undefined;
    if (cmsPage) matchedPageIds.add(cmsPage.pageId);

    const problems = !entry.ok
      ? [{ level: "error" as const, label: "Page injoignable" }]
      : checksForCrawled(entry.title, entry.metaDescription);

    rows.push({
      key: entry.loc,
      url: entry.loc,
      locale,
      statusLabel: cmsPage ? "Publiée" : "En ligne",
      title: entry.title,
      description: entry.metaDescription,
      editHref: cmsPage ? `/content/pages/${cmsPage.pageId}` : null,
      errors: problems.filter((p) => p.level === "error").length,
      warns: problems.filter((p) => p.level === "warn").length,
    });
  }

  // Draft (or otherwise not-yet-live) CMS pages never appear in the
  // sitemap - list them separately so an editor can still find and finish
  // them before publishing.
  for (const p of pages) {
    if (matchedPageIds.has(p.pageId)) continue;
    const checks = seoChecks(p, p.title);
    rows.push({
      key: p.pageId,
      url: null,
      locale: p.locale,
      statusLabel: p.status === "PUBLISHED" ? "Publiée" : "Brouillon",
      title: p.seoTitle ?? p.title,
      description: p.metaDescription,
      editHref: `/content/pages/${p.pageId}`,
      errors: checks.filter((c) => c.level === "error").length,
      warns: checks.filter((c) => c.level === "warn").length,
    });
  }

  rows.sort((a, b) => (a.url ?? "").localeCompare(b.url ?? "") || a.locale.localeCompare(b.locale));

  const totalErrors = rows.reduce((n, r) => n + r.errors, 0);
  const totalWarnings = rows.reduce((n, r) => n + r.warns, 0);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-navy-800">Pages SEO</h1>
        <p className="mt-1 text-sm text-navy-700/55">
          {rows.length} page(s) · {totalErrors} problème(s) bloquant(s) · {totalWarnings} avertissement(s)
          — les pages réellement en ligne viennent du vrai site (titre/méta-description réels, comme
          l&apos;Audit SEO), pas seulement de celles créées dans l&apos;éditeur de pages.
        </p>
      </div>

      <div className="card overflow-hidden rounded-2xl">
        {rows.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-gray-400">
            Aucune page — le site public est peut-être injoignable.
          </p>
        ) : (
          <div className="max-h-[600px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface-alt">
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
                {rows.map((row) => (
                  <tr key={row.key} className="hover:bg-gray-50">
                    <td className="max-w-xs px-6 py-3">
                      {row.editHref ? (
                        <Link href={row.editHref} className="font-medium text-navy-800 hover:underline">
                          {row.title ?? "(sans titre)"}
                        </Link>
                      ) : row.url ? (
                        <a
                          href={row.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-navy-800 hover:underline"
                        >
                          {row.title ?? "(sans titre)"}
                        </a>
                      ) : (
                        <span className="font-medium text-navy-800">{row.title ?? "(sans titre)"}</span>
                      )}
                      <div className="truncate text-xs text-gray-400" title={row.url ?? undefined}>
                        {row.url ? new URL(row.url).pathname : "pas encore publiée"}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-gray-700">
                      {LOCALE_FLAG[row.locale] ?? ""} {row.locale}
                    </td>
                    <td className="px-6 py-3 text-gray-700">{row.statusLabel}</td>
                    <td className="px-6 py-3 text-gray-700">
                      {row.title ? "✓" : <span className="text-rose">✗ manquant</span>}
                    </td>
                    <td className="px-6 py-3 text-gray-700">
                      {row.description ? "✓" : <span className="text-rose">✗ manquante</span>}
                    </td>
                    <td className="px-6 py-3">
                      {row.errors === 0 && row.warns === 0 ? (
                        <span className="text-emerald">✓ tout est bon</span>
                      ) : (
                        <span>
                          {row.errors > 0 && <span className="text-rose">{row.errors} erreur(s) </span>}
                          {row.warns > 0 && <span className="text-gold-dark">{row.warns} avertissement(s)</span>}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
