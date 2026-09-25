"use client";

import { readApiError } from "@/lib/apiError";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { LEVEL_LABELS, LEVELS, RESOURCE_LABELS, levelClass } from "./RolePermissionsMatrix";
import { ALL_ADMIN_RESOURCES, type AdminResource, type PermissionLevel } from "@/lib/api";

export default function CustomRoleMatrix({
  roleName,
  roleLabel,
  initialPermissions,
}: {
  roleName: string;
  roleLabel: string;
  initialPermissions: Record<AdminResource, PermissionLevel>;
}) {
  const router = useRouter();
  const toast = useToast();
  const [permissions, setPermissions] = useState(initialPermissions);
  const [busy, setBusy] = useState(false);

  const dirty = useMemo(
    () => JSON.stringify(permissions) !== JSON.stringify(initialPermissions),
    [permissions, initialPermissions],
  );

  function setLevel(resource: AdminResource, level: PermissionLevel) {
    setPermissions((prev) => ({ ...prev, [resource]: level }));
  }

  async function onSave() {
    setBusy(true);
    const res = await fetch(`/api/proxy/admin/custom-roles/${roleName}/permissions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(permissions),
    });
    setBusy(false);
    if (!res.ok) {
      toast.error(await readApiError(res));
      return;
    }
    const saved = await res.json();
    setPermissions(saved);
    toast.success("Permissions enregistrées");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/administration/roles-personnalises" className="text-[13px] text-navy-700/55 hover:underline">
          ← Rôles personnalisés
        </Link>
        <h1 className="mt-1 text-xl font-bold text-navy-800">{roleLabel}</h1>
        <p className="mt-1 text-sm text-navy-700/55">
          Ce que les comptes avec ce rôle peuvent voir/modifier dans le backoffice.
        </p>
      </div>

      <div className="card overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt">
              <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400">
                <th className="px-6 py-3 font-medium">Ressource</th>
                <th className="px-6 py-3 font-medium">Accès</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ALL_ADMIN_RESOURCES.map((resource) => (
                <tr key={resource} className="hover:bg-gray-50">
                  <td className="px-6 py-2.5 font-medium text-navy-800">{RESOURCE_LABELS[resource]}</td>
                  <td className="px-6 py-2.5">
                    <select
                      value={permissions[resource]}
                      onChange={(e) => setLevel(resource, e.target.value as PermissionLevel)}
                      className={`rounded-lg border border-navy-700/15 bg-white px-2 py-1 text-[13px] font-semibold ${levelClass(
                        permissions[resource],
                      )}`}
                    >
                      {LEVELS.map((level) => (
                        <option key={level} value={level}>
                          {LEVEL_LABELS[level]}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="button" onClick={onSave} disabled={!dirty || busy} className="btn btn-primary">
          {busy ? "Enregistrement…" : "Enregistrer les permissions"}
        </button>
        {dirty && !busy && <span className="text-[12px] text-navy-700/50">Modifications non enregistrées</span>}
      </div>
    </div>
  );
}
