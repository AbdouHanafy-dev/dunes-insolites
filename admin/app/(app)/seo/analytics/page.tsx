import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { getSeoAnalyticsStatus, getAnalyticsTraffic, getSearchConsoleQueries } from "@/lib/api";

export const metadata: Metadata = { title: "Analytics & Search Console" };

// Real data now (15 Sep 2026) — see GoogleAnalyticsReportingService. Still
// an honest "not connected" screen when the Google Cloud setup
// (docs/seo-analytics-setup.md) hasn't been done for one or both; never a
// placeholder/fake number in either state.
export default async function SeoAnalyticsPage() {
  const session = await getSession();
  if (!session) return null;

  const status = await getSeoAnalyticsStatus(session.accessToken);
  const [traffic, queries] = await Promise.all([
    status.analyticsConfigured ? getAnalyticsTraffic(session.accessToken) : null,
    status.searchConsoleConfigured ? getSearchConsoleQueries(session.accessToken) : null,
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-navy-800">Analytics & Search Console</h1>
        <p className="mt-1 text-sm text-navy-700/55">
          Trafic réel (Google Analytics 4) et performance de recherche réelle (Google Search Console),
          derniers 28 jours — rien n&apos;est affiché tant que ce n&apos;est pas réellement connecté à vos
          comptes Google.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatusCard
          title="Google Analytics 4"
          configured={status.analyticsConfigured}
          description="Sessions, pages vues, sources de trafic, conversions réelles."
        />
        <StatusCard
          title="Google Search Console"
          configured={status.searchConsoleConfigured}
          description="Impressions, clics, position moyenne, requêtes réelles sur Google."
        />
      </div>

      {(!status.analyticsConfigured || !status.searchConsoleConfigured) && (
        <div className="card rounded-2xl p-6">
          <h2 className="text-[15px] font-bold text-navy-800">Comment activer ceci</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-navy-700/65">
            La connexion à Google nécessite un compte de service Google Cloud, autorisé sur vos vraies
            propriétés Analytics et Search Console — une configuration ponctuelle côté Google, pas
            quelque chose que le backoffice peut faire à votre place. Le guide complet, étape par étape,
            se trouve dans <code className="rounded bg-navy-700/8 px-1.5 py-0.5">docs/seo-analytics-setup.md</code>{" "}
            à la racine du projet.
          </p>
        </div>
      )}

      {traffic && (
        <section>
          <h2 className="mb-2 text-[13px] font-bold uppercase tracking-wide text-navy-700/50">
            Trafic (Google Analytics 4)
          </h2>
          {!traffic.ok ? (
            <p className="text-sm text-rose">{traffic.error ?? "Impossible de charger le trafic."}</p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatTile label="Sessions" value={traffic.totalSessions} />
                <StatTile label="Pages vues" value={traffic.totalPageViews} />
                <StatTile label="Visiteurs" value={traffic.totalUsers} />
              </div>
              {traffic.daily.length > 0 && (
                <div className="card mt-4 overflow-hidden rounded-2xl">
                  <div className="max-h-[360px] overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-surface-alt">
                        <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400">
                          <th className="px-6 py-3 font-medium">Date</th>
                          <th className="px-6 py-3 text-right font-medium">Sessions</th>
                          <th className="px-6 py-3 text-right font-medium">Pages vues</th>
                          <th className="px-6 py-3 text-right font-medium">Visiteurs</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {[...traffic.daily].reverse().map((d) => (
                          <tr key={d.date} className="hover:bg-gray-50">
                            <td className="px-6 py-2 font-mono text-[12px] text-navy-800">{formatDate(d.date)}</td>
                            <td className="px-6 py-2 text-right text-gray-700">{d.sessions}</td>
                            <td className="px-6 py-2 text-right text-gray-700">{d.pageViews}</td>
                            <td className="px-6 py-2 text-right text-gray-700">{d.users}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {queries && (
        <section>
          <h2 className="mb-2 text-[13px] font-bold uppercase tracking-wide text-navy-700/50">
            Requêtes de recherche les plus fréquentes (Google Search Console)
          </h2>
          {!queries.ok ? (
            <p className="text-sm text-rose">{queries.error ?? "Impossible de charger les requêtes."}</p>
          ) : queries.topQueries.length === 0 ? (
            <p className="text-sm text-gray-400">Aucune donnée pour cette période.</p>
          ) : (
            <div className="card overflow-hidden rounded-2xl">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400">
                    <th className="px-6 py-3 font-medium">Requête</th>
                    <th className="px-6 py-3 text-right font-medium">Clics</th>
                    <th className="px-6 py-3 text-right font-medium">Impressions</th>
                    <th className="px-6 py-3 text-right font-medium">CTR</th>
                    <th className="px-6 py-3 text-right font-medium">Position moy.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {queries.topQueries.map((q) => (
                    <tr key={q.query} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-navy-800">{q.query}</td>
                      <td className="px-6 py-3 text-right font-medium text-gray-900">{q.clicks}</td>
                      <td className="px-6 py-3 text-right text-gray-700">{q.impressions}</td>
                      <td className="px-6 py-3 text-right text-gray-700">{(q.ctr * 100).toFixed(1)}%</td>
                      <td className="px-6 py-3 text-right text-gray-700">{q.position.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function formatDate(yyyymmdd: string): string {
  // GA4 returns "20260915" - no separators.
  if (yyyymmdd.length !== 8) return yyyymmdd;
  return `${yyyymmdd.slice(6, 8)}/${yyyymmdd.slice(4, 6)}/${yyyymmdd.slice(0, 4)}`;
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="card rounded-2xl p-5">
      <p className="text-[28px] font-bold text-navy-800">{value.toLocaleString("fr-FR")}</p>
      <p className="mt-1 text-[12px] uppercase tracking-wide text-navy-700/50">{label}</p>
    </div>
  );
}

function StatusCard({
  title,
  configured,
  description,
}: {
  title: string;
  configured: boolean;
  description: string;
}) {
  return (
    <div className="card rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-bold text-navy-800">{title}</p>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ${
            configured ? "bg-emerald/12 text-emerald" : "bg-navy-700/8 text-navy-700/55"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${configured ? "bg-emerald" : "bg-navy-700/35"}`} />
          {configured ? "Connecté" : "Non connecté"}
        </span>
      </div>
      <p className="mt-1.5 text-[12px] leading-relaxed text-navy-700/50">{description}</p>
    </div>
  );
}
