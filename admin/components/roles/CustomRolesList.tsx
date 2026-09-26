"use client";

import { readApiError } from "@/lib/apiError";
import { useFormIssues } from "@/components/useFormIssues";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";
import type { CustomRole } from "@/lib/api";

const ROLE_FIELDS = [
  { key: "name", label: "Nom (identifiant technique)", type: "text", required: true },
  { key: "label", label: "Libellé affiché", type: "text", required: true },
];
const MODAL_INPUT = "mt-1 w-full rounded-[9px] border border-navy-700/15 bg-white px-3.5 py-2.5 text-[14px] text-navy-800 outline-none focus:border-gold/60";

/**
 * Admin-creatable roles (on request, 15 Sep 2026) — additive to the fixed
 * "Rôles & permissions" screen (RolePermissionsMatrix.tsx), not a
 * replacement. A custom role only ever reaches the same CMS-ish
 * @perm.can(...) surface that screen's matrix covers — never reservations/
 * invoices/etc — see CustomRoleController's own comment.
 */
export default function CustomRolesList({ initialItems }: { initialItems: CustomRole[] }) {
  const router = useRouter();
  const toast = useToast();
  const fi = useFormIssues(ROLE_FIELDS);
  const cls = (key: string) => (fi.has(key) ? MODAL_INPUT.replace("border-navy-700/15", "border-rose") : MODAL_INPUT);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CustomRole | null>(null);
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    fi.clear();
    const technicalName = name.trim().toUpperCase();
    const problems = [];
    if (!technicalName) problems.push(fi.issue("name", "champ obligatoire — il est vide."));
    else if (!/^[A-Z0-9_]+$/.test(technicalName)) {
      problems.push(fi.issue("name", `majuscules, chiffres et underscore uniquement (saisi : ${name.trim()}).`));
    } else if (initialItems.some((r) => r.name === technicalName)) {
      problems.push(fi.issue("name", `ce rôle existe déjà (${technicalName}).`));
    }
    if (!label.trim()) problems.push(fi.issue("label", "champ obligatoire — il est vide."));
    if (problems.length > 0) {
      toast.error(fi.local(problems));
      return;
    }
    setBusy(true);
    const res = await fetch("/api/proxy/admin/custom-roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: technicalName, label: label.trim() }),
    });
    setBusy(false);
    if (!res.ok) {
      toast.error(await fi.fromResponse(res, "Création du rôle refusée"));
      return;
    }
    toast.success("Rôle créé.");
    fi.clear();
    setCreateOpen(false);
    setName("");
    setLabel("");
    router.refresh();
  }

  async function onDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/proxy/admin/custom-roles/${deleteTarget.name}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const message = await readApiError(res, "Suppression impossible");
      setError(message);
      toast.error(message);
      return;
    }
    toast.success("Rôle supprimé.");
    setDeleteTarget(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-navy-800">Rôles personnalisés</h1>
          <p className="mt-1 text-sm text-navy-700/55">
            Créez un rôle, donnez-lui des permissions sur le backoffice (Pages, Galerie, Newsletter…),
            puis attribuez-le à un compte de type &quot;Rôle personnalisé&quot; dans Utilisateurs.
            N&apos;atteint jamais les réservations, factures ou clients — ces accès restent réservés à
            Admin/Camping.
          </p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="btn btn-primary">
          + Créer un rôle
        </button>
      </div>

      <div className="card overflow-hidden rounded-2xl">
        {initialItems.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-gray-400">Aucun rôle personnalisé pour le moment.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400">
                  <th className="px-6 py-3 font-medium">Nom</th>
                  <th className="px-6 py-3 font-medium">Libellé</th>
                  <th className="px-6 py-3 font-medium">Comptes</th>
                  <th className="px-6 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {initialItems.map((role) => (
                  <tr key={role.name} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-mono text-[13px] text-navy-800">{role.name}</td>
                    <td className="px-6 py-3 text-gray-700">{role.label}</td>
                    <td className="px-6 py-3 text-gray-700">{role.userCount}</td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/administration/roles-personnalises/${role.name}`}
                          className="btn btn-secondary btn-sm"
                        >
                          Permissions
                        </Link>
                        <button
                          onClick={() => {
                            setError("");
                            setDeleteTarget(role);
                          }}
                          disabled={role.userCount > 0}
                          title={role.userCount > 0 ? "Retirez ce rôle des comptes concernés d'abord" : undefined}
                          className="btn btn-danger-outline btn-sm"
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {createOpen && (
        <Modal title="Créer un rôle personnalisé" onClose={() => setCreateOpen(false)}>
          <form onSubmit={onCreate} noValidate className="flex flex-col gap-3">
            <label className="text-[13px] text-navy-700/70">
              Nom (identifiant technique)
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="SUPPORT"
                required
                className={cls("name")}
              />
              {fi.errs("name")}
              <span className="mt-1 block text-[12px] text-navy-700/45">
                Majuscules, chiffres, underscore uniquement — ne peut plus être changé après.
              </span>
            </label>
            <label className="text-[13px] text-navy-700/70">
              Libellé affiché
              <input
                id="label"
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Support client"
                required
                className={cls("label")}
              />
              {fi.errs("label")}
            </label>
            {fi.panel()}
            <div className="mt-2 flex justify-end gap-2">
              <button type="button" onClick={() => setCreateOpen(false)} className="btn btn-secondary">
                Annuler
              </button>
              <button type="submit" disabled={busy} className="btn btn-primary">
                {busy ? "Création…" : "Créer"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Supprimer ce rôle" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-navy-700/80">
            Supprimer <strong>{deleteTarget.label}</strong> ({deleteTarget.name}) ? Cette action est
            irréversible.
          </p>
          {error && (
            <div className="mt-3 rounded-[10px] border border-rose/25 bg-rose/8 px-4 py-3 text-[13px] text-rose">
              {error}
            </div>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setDeleteTarget(null)} className="btn btn-secondary">
              Annuler
            </button>
            <button onClick={onDelete} disabled={busy} className="btn btn-danger">
              {busy ? "Suppression…" : "Supprimer"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
