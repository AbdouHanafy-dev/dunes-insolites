import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import {
  getUserCountsByRole,
  getSecurityEndpoints,
  getRolePermissionMatrix,
  type UserRole,
} from "@/lib/api";
import SecurityEndpointsTable from "@/components/roles/SecurityEndpointsTable";
import RolePermissionsMatrix from "@/components/roles/RolePermissionsMatrix";

export const metadata: Metadata = { title: "Rôles & permissions" };

// CAMPING and PARTENAIRE's access is now a real, editable matrix
// (role_permissions table, enforced by PermissionGuard/@perm.can(...) on
// each converted controller) — no longer just this page's prose. ADMIN and
// CLIENT stay fixed (FULL / NONE) and are not editable, for the reasons
// RolePermissionServiceImpl.updateMatrix rejects an edit to either: ADMIN
// must never depend on a row existing, and CLIENT never reaches this
// backoffice at all.
const ROLE_INFO: Record<UserRole, { label: string; description: string }> = {
  ADMIN: {
    label: "Administrateur",
    description:
      "Accès complet, fixe — tout le backoffice, y compris les endpoints /api/admin/** et toute action réservée hasRole('ADMIN') ci-dessous.",
  },
  CAMPING: {
    label: "Camping",
    description:
      "Opérations du camp — le tableau ci-dessous définit précisément ce que ce rôle peut voir/modifier, ressource par ressource.",
  },
  PARTENAIRE: {
    label: "Partenaire",
    description:
      "Agences/revendeurs — le tableau ci-dessous définit précisément ce que ce rôle peut voir/modifier, ressource par ressource.",
  },
  CLIENT: {
    label: "Client",
    description:
      "Compte espace-client public, fixe — n'accède à aucune route de ce backoffice, quel que soit ce tableau.",
  },
};

export default async function RolesPage() {
  const session = await getSession();
  if (!session) return null;

  const [counts, endpoints, matrix] = await Promise.all([
    getUserCountsByRole(session.accessToken),
    getSecurityEndpoints(session.accessToken),
    getRolePermissionMatrix(session.accessToken),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-navy-800">Rôles & permissions</h1>
        <p className="mt-1 text-sm text-navy-700/55">
          Camping et Partenaire ont désormais un accès configurable, ressource par ressource — aucun
          accès, lecture seule, modification, ou accès complet. Admin et Client restent fixes. Le
          tableau des endpoints en bas reflète en direct les règles du backend, pas une copie qui
          pourrait diverger.
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
          Permissions par ressource
        </h2>
        {matrix ? (
          <RolePermissionsMatrix initialMatrix={matrix} />
        ) : (
          <p className="text-sm text-rose">
            Impossible de charger la matrice des permissions — vérifiez que le backend répond.
          </p>
        )}
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
