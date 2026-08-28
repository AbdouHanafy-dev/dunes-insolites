import type { Metadata } from "next";
import { getSitemapEntries } from "@/lib/sitemap";

export const metadata: Metadata = { title: "Sitemap" };

export default async function SitemapOverviewPage() {
  const entries = await getSitemapEntries();

  // The expected hreflang count per URL is whatever most entries actually
  // have, not a hardcoded "7" — so this never needs updating in lockstep
  // with the vitrine if a locale is ever added or removed.
  const counts = new Map<number, number>();
  for (const e of entries) counts.set(e.hreflangs.length, (counts.get(e.hreflangs.length) ?? 0) + 1);
  const expectedHreflangCount = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;

  const seen = new Map<string, number>();
  for (const e of entries) seen.set(e.loc, (seen.get(e.loc) ?? 0) + 1);
  const duplicates = new Set([...seen.entries()].filter(([, n]) => n > 1).map(([loc]) => loc));

  const missingXDefault = entries.filter((e) => !e.hreflangs.includes("x-default"));
  const mismatchedHreflangCount = entries.filter(
    (e) => e.hreflangs.length !== expectedHreflangCount,
  );

  const problems = duplicates.size + missingXDefault.length + mismatchedHreflangCount.length;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-navy-800">Sitemap</h1>
        <p className="mt-1 text-sm text-navy-700/55">
          Lu en direct depuis le sitemap.xml réellement servi par le vitrine — pas une copie qui
          pourrait diverger de ce que Google reçoit vraiment.{" "}
          {entries.length === 0
            ? "Vitrine injoignable ou sitemap vide."
            : `${entries.length} URL(s) · ${problems === 0 ? "aucun problème détecté" : `${problems} problème(s) détecté(s)`}.`}
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="card rounded-2xl px-6 py-16 text-center">
          <p className="text-sm text-gray-400">
            Impossible de lire le sitemap — vérifiez que le vitrine tourne (NEXT_PUBLIC_FRONTEND_URL).
          </p>
        </div>
      ) : (
        <>
          {problems > 0 && (
            <div className="card rounded-2xl border border-rose/25 bg-rose/6 p-4 text-[13px] text-rose">
              {duplicates.size > 0 && <p>{duplicates.size} URL en double dans le sitemap.</p>}
              {missingXDefault.length > 0 && (
                <p>{missingXDefault.length} URL sans alternate x-default.</p>
              )}
              {mismatchedHreflangCount.length > 0 && (
                <p>
                  {mismatchedHreflangCount.length} URL avec un nombre d&apos;alternates inhabituel
                  (attendu {expectedHreflangCount}).
                </p>
              )}
            </div>
          )}

          <div className="card overflow-hidden rounded-2xl">
            <div className="max-h-[600px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface-alt">
                  <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400">
                    <th className="px-6 py-3 font-medium">URL</th>
                    <th className="px-6 py-3 font-medium">Priorité</th>
                    <th className="px-6 py-3 font-medium">Fréquence</th>
                    <th className="px-6 py-3 font-medium">Alternates (hreflang)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {entries.map((e, i) => {
                    const isDup = duplicates.has(e.loc);
                    const missingDefault = !e.hreflangs.includes("x-default");
                    const badCount = e.hreflangs.length !== expectedHreflangCount;
                    const hasIssue = isDup || missingDefault || badCount;
                    return (
                      <tr key={`${e.loc}-${i}`} className="hover:bg-gray-50">
                        <td className="max-w-md truncate px-6 py-2.5 font-mono text-[12px] text-navy-800">
                          {e.loc}
                        </td>
                        <td className="px-6 py-2.5 text-gray-700">{e.priority ?? "—"}</td>
                        <td className="px-6 py-2.5 text-gray-700">{e.changefreq ?? "—"}</td>
                        <td className="px-6 py-2.5">
                          {hasIssue ? (
                            <span className="text-rose">
                              {e.hreflangs.length}
                              {isDup && " · doublon"}
                              {missingDefault && " · pas de x-default"}
                            </span>
                          ) : (
                            <span className="text-gray-700">{e.hreflangs.length}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
