import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { getSeoAnalyticsStatus } from "@/lib/api";

export const metadata: Metadata = { title: "Analytics & Search Console" };

// The place, prepared: this page is deliberately an honest "not connected"
// screen today, not a dashboard with placeholder/fake numbers in it - see
// docs/seo-analytics-setup.md for exactly what turns this into a real one
// (a Google Cloud service account, granted access on the real GA4 and
// Search Console properties). Once backend/.env has the three real values
// GoogleSeoProperties reads, this same route is where the actual traffic/
// ranking charts get built - the status check below already tells you
// which of the two is ready.
export default async function SeoAnalyticsPage() {
  const session = await getSession();
  if (!session) return null;

  const status = await getSeoAnalyticsStatus(session.accessToken);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-navy-800">Analytics & Search Console</h1>
        <p className="mt-1 text-sm text-navy-700/55">
          Trafic réel (Google Analytics 4) et performance de recherche réelle (Google Search Console) —
          rien n&apos;est affiché tant que ce n&apos;est pas réellement connecté à vos comptes Google.
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
            à la racine du projet. Une fois fait, indiquez-le à Claude — il connaît déjà l&apos;endroit
            exact où brancher les vraies données.
          </p>
        </div>
      )}
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
