import type { Metadata } from "next";
import { getSeoAudit } from "@/lib/seoAudit";

export const metadata: Metadata = { title: "Audit SEO" };

// Same thresholds as admin/lib/seo.ts's per-page checks (SeoEditor.tsx /
// Pages SEO) — one convention for "good title/description length" across
// the backoffice, not two that could disagree.
const TITLE_MIN = 30;
const TITLE_MAX = 60;
const DESC_MIN = 70;
const DESC_MAX = 160;

type Problem = { level: "error" | "warn"; label: string };

function problemsFor(
  entry: { loc: string; ok: boolean; title: string | null; metaDescription: string | null; canonical: string | null },
): Problem[] {
  const problems: Problem[] = [];
  if (!entry.ok) {
    problems.push({ level: "error", label: "Page injoignable" });
    return problems;
  }
  if (!entry.title) {
    problems.push({ level: "error", label: "Titre manquant" });
  } else if (entry.title.length < TITLE_MIN || entry.title.length > TITLE_MAX) {
    problems.push({ level: "warn", label: `Titre : ${entry.title.length} caractères (idéal ${TITLE_MIN}–${TITLE_MAX})` });
  }
  if (!entry.metaDescription) {
    problems.push({ level: "error", label: "Méta-description manquante" });
  } else if (entry.metaDescription.length < DESC_MIN || entry.metaDescription.length > DESC_MAX) {
    problems.push({
      level: "warn",
      label: `Méta-description : ${entry.metaDescription.length} caractères (idéal ${DESC_MIN}–${DESC_MAX})`,
    });
  }
  if (!entry.canonical) {
    problems.push({ level: "error", label: "Balise canonical manquante" });
  } else if (entry.canonical !== entry.loc) {
    problems.push({ level: "warn", label: `Canonical (${entry.canonical}) diffère de l'URL du sitemap` });
  }
  return problems;
}

export default async function SeoAuditPage() {
  const entries = await getSeoAudit();

  const rows = entries.map((e) => ({ entry: e, problems: problemsFor(e) }));

  const titleCounts = new Map<string, number>();
  const descCounts = new Map<string, number>();
  for (const e of entries) {
    if (e.title) titleCounts.set(e.title, (titleCounts.get(e.title) ?? 0) + 1);
    if (e.metaDescription) descCounts.set(e.metaDescription, (descCounts.get(e.metaDescription) ?? 0) + 1);
  }
  const duplicateTitles = new Set([...titleCounts.entries()].filter(([, n]) => n > 1).map(([t]) => t));
  const duplicateDescs = new Set([...descCounts.entries()].filter(([, n]) => n > 1).map(([d]) => d));

  const totalErrors = rows.reduce((n, r) => n + r.problems.filter((p) => p.level === "error").length, 0);
  const totalWarnings = rows.reduce((n, r) => n + r.problems.filter((p) => p.level === "warn").length, 0);
  const duplicateCount = duplicateTitles.size + duplicateDescs.size;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-navy-800">Audit SEO</h1>
        <p className="mt-1 text-sm text-navy-700/55">
          Crawl en direct de chaque URL du sitemap — vérifie le vrai HTML rendu, pas ce qui a été saisi
          dans le CMS. Mis en cache 30 minutes par URL pour ne pas surcharger le site public.{" "}
          {entries.length === 0
            ? "Sitemap injoignable."
            : `${entries.length} URL(s) · ${totalErrors} erreur(s) · ${totalWarnings} avertissement(s) · ${duplicateCount} titre(s)/description(s) en double.`}
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="card rounded-2xl px-6 py-16 text-center">
          <p className="text-sm text-gray-400">
            Impossible de lire le sitemap — vérifiez que le vitrine tourne (NEXT_PUBLIC_FRONTEND_URL).
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden rounded-2xl">
          <div className="max-h-[600px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface-alt">
                <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400">
                  <th className="px-6 py-3 font-medium">URL</th>
                  <th className="px-6 py-3 font-medium">Titre</th>
                  <th className="px-6 py-3 font-medium">Méta-description</th>
                  <th className="px-6 py-3 font-medium">Vérifications</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map(({ entry, problems }) => {
                  const dupTitle = entry.title ? duplicateTitles.has(entry.title) : false;
                  const dupDesc = entry.metaDescription ? duplicateDescs.has(entry.metaDescription) : false;
                  const errors = problems.filter((p) => p.level === "error").length;
                  const warns = problems.filter((p) => p.level === "warn").length + (dupTitle ? 1 : 0) + (dupDesc ? 1 : 0);
                  return (
                    <tr key={entry.loc} className="hover:bg-gray-50">
                      <td className="max-w-xs truncate px-6 py-2.5 font-mono text-[12px] text-navy-800" title={entry.loc}>
                        {entry.loc}
                      </td>
                      <td className="max-w-xs truncate px-6 py-2.5 text-gray-700" title={entry.title ?? ""}>
                        {entry.title ?? "—"}
                        {dupTitle && <span className="ml-1.5 text-[11px] text-gold-dark">(doublon)</span>}
                      </td>
                      <td className="max-w-xs truncate px-6 py-2.5 text-gray-700" title={entry.metaDescription ?? ""}>
                        {entry.metaDescription ?? "—"}
                        {dupDesc && <span className="ml-1.5 text-[11px] text-gold-dark">(doublon)</span>}
                      </td>
                      <td
                        className="px-6 py-2.5"
                        title={[
                          ...problems.map((p) => p.label),
                          dupTitle ? "Titre identique à une autre page" : null,
                          dupDesc ? "Méta-description identique à une autre page" : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      >
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
        </div>
      )}
    </div>
  );
}
