"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import {
  ALL_ADMIN_RESOURCES,
  type AdminResource,
  type PermissionLevel,
  type PermissionMatrix,
  type UserRole,
} from "@/lib/api";

// Exported for CustomRoleMatrix.tsx (Administration > Rôles personnalisés) —
// one shared vocabulary for "what does READ/EDIT/FULL on GALLERY mean",
// rather than a second copy that could drift.
export const RESOURCE_LABELS: Record<AdminResource, string> = {
  USERS: "Utilisateurs",
  RESERVATIONS: "Réservations (listes/recherche)",
  INVOICES: "Factures & proformas",
  TRANSACTIONS: "Transactions",
  TOURS: "Tours (Route Insolite)",
  TOUR_TYPES: "Hébergements (types de séjour)",
  EXTRAS: "Extras",
  REVIEWS: "Avis (modération)",
  AVAILABILITY: "Disponibilités",
  PAGES: "Pages (CMS)",
  CONTENT_BLOCKS: "Blocs de contenu",
  MEDIA: "Médiathèque",
  NAVIGATION: "Navigation",
  REDIRECTS: "Redirections",
  GALLERY: "Galerie photos",
  MAINTENANCE_WINDOWS: "Maintenance",
  NEWSLETTER_SUBSCRIBERS: "Newsletter",
};

export const LEVEL_LABELS: Record<PermissionLevel, string> = {
  NONE: "Aucun accès",
  READ: "Lecture seule",
  EDIT: "Modifier",
  FULL: "Accès complet",
};

export const LEVELS: PermissionLevel[] = ["NONE", "READ", "EDIT", "FULL"];

const EDITABLE_ROLES: UserRole[] = ["CAMPING", "PARTENAIRE"];

export function levelClass(level: PermissionLevel): string {
  switch (level) {
    case "NONE":
      return "text-navy-700/40";
    case "READ":
      return "text-sky-700";
    case "EDIT":
      return "text-amber-700";
    case "FULL":
      return "text-emerald";
  }
}

export default function RolePermissionsMatrix({ initialMatrix }: { initialMatrix: PermissionMatrix }) {
  const router = useRouter();
  const toast = useToast();
  const [matrix, setMatrix] = useState<PermissionMatrix>(initialMatrix);
  const [busy, setBusy] = useState(false);

  const dirty = useMemo(
    () => JSON.stringify(matrix) !== JSON.stringify(initialMatrix),
    [matrix, initialMatrix],
  );

  function setLevel(role: UserRole, resource: AdminResource, level: PermissionLevel) {
    setMatrix((prev) => ({ ...prev, [role]: { ...prev[role], [resource]: level } }));
  }

  async function onSave() {
    setBusy(true);
    const updates = Object.fromEntries(EDITABLE_ROLES.map((role) => [role, matrix[role]]));

    const res = await fetch("/api/proxy/admin/role-permissions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });

    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.message ?? data.error ?? "Une erreur est survenue.");
      return;
    }
    const saved: PermissionMatrix = await res.json();
    setMatrix(saved);
    toast.success("Permissions enregistrées");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="card overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt">
              <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400">
                <th className="px-6 py-3 font-medium">Ressource</th>
                <th className="px-6 py-3 font-medium">Admin</th>
                <th className="px-6 py-3 font-medium">Camping</th>
                <th className="px-6 py-3 font-medium">Partenaire</th>
                <th className="px-6 py-3 font-medium">Client</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ALL_ADMIN_RESOURCES.map((resource) => (
                <tr key={resource} className="hover:bg-gray-50">
                  <td className="px-6 py-2.5 font-medium text-navy-800">{RESOURCE_LABELS[resource]}</td>

                  <td className="px-6 py-2.5">
                    <span className={`text-[13px] font-semibold ${levelClass("FULL")}`}>
                      {LEVEL_LABELS.FULL}
                    </span>
                    <span className="ml-1.5 text-[11px] text-navy-700/35">(fixe)</span>
                  </td>

                  {EDITABLE_ROLES.map((role) => (
                    <td key={role} className="px-6 py-2.5">
                      <select
                        value={matrix[role][resource]}
                        onChange={(e) => setLevel(role, resource, e.target.value as PermissionLevel)}
                        className={`rounded-lg border border-navy-700/15 bg-white px-2 py-1 text-[13px] font-semibold ${levelClass(
                          matrix[role][resource],
                        )}`}
                      >
                        {LEVELS.map((level) => (
                          <option key={level} value={level}>
                            {LEVEL_LABELS[level]}
                          </option>
                        ))}
                      </select>
                    </td>
                  ))}

                  <td className="px-6 py-2.5">
                    <span className={`text-[13px] font-semibold ${levelClass("NONE")}`}>
                      {LEVEL_LABELS.NONE}
                    </span>
                    <span className="ml-1.5 text-[11px] text-navy-700/35">(fixe)</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={!dirty || busy}
          className="btn btn-primary"
        >
          {busy ? "Enregistrement…" : "Enregistrer les permissions"}
        </button>
        {dirty && !busy && (
          <span className="text-[12px] text-navy-700/50">Modifications non enregistrées</span>
        )}
      </div>

      <p className="text-[12px] text-navy-700/45">
        Admin garde toujours un accès complet et Client n&apos;a jamais accès à ce backoffice — ni
        l&apos;un ni l&apos;autre n&apos;est modifiable ici. Certaines actions particulièrement
        sensibles (suppression définitive d&apos;un compte, d&apos;une réservation ou d&apos;une
        facture, génération de facture) restent réservées à Admin quel que soit ce tableau — voir le
        tableau des endpoints ci-dessous pour le détail exact.
      </p>
    </div>
  );
}
