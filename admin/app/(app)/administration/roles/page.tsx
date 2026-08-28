import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { getUserCountsByRole, getSecurityEndpoints, type UserRole } from "@/lib/api";
import SecurityEndpointsTable from "@/components/roles/SecurityEndpointsTable";

export const metadata: Metadata = { title: "Rôles & permissions" };

// The 4 roles are a fixed enum (UserRole, backend/model/enums/UserRole.java),
// mirrored as Keycloak realm roles — not a database table an admin edits.
// This page is deliberately read-only: what each role covers, in prose, plus
// the live, reflected list of every @PreAuthorize rule below. Nothing here
// is editable because nothing here would actually change what the backend
// enforces — a free-form roles/permissions CRUD would just be a second,
// fake source of truth next to the real one.
const ROLE_INFO: Record<UserRole, { label: string; description: string }> = {
  ADMIN: {
    label: "Administrateur",
    description:
      "Accès complet — tout le backoffice, y compris les endpoints /api/admin/** et toute action réservée hasRole('ADMIN') ci-dessous.",
  },
  CAMPING: {
    label: "Camping",
    description:
      "Opérations du camp — réservations, extras, tours, factures, transactions. Pas d'accès aux endpoints ADMIN-only (utilisateurs, contenu CMS, médiathèque, statistiques).",
  },
  PARTENAIRE: {
    label: "Partenaire",
    description:
      "Agences/revendeurs — création et suivi de leurs propres réservations. Accès le plus restreint des comptes staff.",
  },
  CLIENT: {
    label: "Client",
    description:
      "Compte espace-client public — ses propres réservations et son profil uniquement. N'accède à aucune route de ce backoffice.",
  },
};

export default async function RolesPage() {
  const session = await getSession();
  if (!session) return null;

  const [counts, endpoints] = await Promise.all([
    getUserCountsByRole(session.accessToken),
    getSecurityEndpoints(session.accessToken),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-navy-800">Rôles & permissions</h1>
        <p className="mt-1 text-sm text-navy-700/55">
          Les rôles sont fixes (Keycloak + UserRole côté backend) — cette page ne les édite pas, elle
          montre ce qu&apos;ils couvrent réellement. Le tableau du bas reflète en direct les annotations
          @PreAuthorize du backend, pas une copie qui pourrait diverger.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(ROLE_INFO) as UserRole[]).map((role) => (
          <div key={role} className="card rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-bold text-navy-800">{ROLE_INFO[role].label}</p>
              <span className="rounded-full bg-navy-700/6 px-2.5 py-0.5 text-[12px] font-bold text-navy-700/70">
                {counts[role]}
              </span>
            </div>
            <p className="mt-1.5 text-[12px] leading-relaxed text-navy-700/55">
              {ROLE_INFO[role].description}
            </p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="mb-2 text-[13px] font-bold uppercase tracking-wide text-navy-700/50">
          Endpoints & règles d&apos;accès ({endpoints.length})
        </h2>
        <SecurityEndpointsTable endpoints={endpoints} />
      </div>
    </div>
  );
}
