"use client";

import { readApiError } from "@/lib/apiError";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Modal from "@/components/Modal";
import PersonCard, { CARD_GRID } from "@/components/PersonCard";
import TableFilters from "@/components/TableFilters";
import { useTableFilters } from "@/components/useTableFilters";
import { useToast } from "@/components/Toast";
import type { AdminUser } from "@/lib/api";
import { optionsFrom, type FilterDef } from "@/lib/tableFilters";

/**
 * Accounts as two-sided cards (clients, partners, staff): identity, role and contact on the front
 * with edit and delete; the business and loyalty details on the back.
 */
export default function UserCards({
  title,
  basePath,
  items,
  roleLabel,
  extraFilters = [],
}: {
  title: string;
  /** Route prefix; "/new" and "/{id}" are appended. */
  basePath: string;
  items: AdminUser[];
  roleLabel: (user: AdminUser) => string;
  extraFilters?: FilterDef<AdminUser>[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const { filtered, bar } = useTableFilters(
    items,
    [
      { id: "role", label: "Type", kind: "select", options: optionsFrom(items, roleLabel), get: roleLabel },
      ...extraFilters,
    ],
    (u) => [u.name, u.email, u.phone, roleLabel(u), u.matriculeFiscal, u.loyaltyTier],
  );

  async function onDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    const res = await fetch(`/api/proxy/users/${deleteTarget.userId}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const message = await readApiError(res, "Suppression impossible");
      setError(message);
      toast.error(message);
      return;
    }
    toast.success("Supprimé avec succès");
    setDeleteTarget(null);
    setError("");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-navy-800">{title}</h1>
          <p className="mt-1 text-sm text-navy-700/55">{items.length} compte(s)</p>
        </div>
        <Link href={`${basePath}/new`} className="btn btn-primary">
          + Créer
        </Link>
      </div>

      <div className="card overflow-hidden rounded-2xl">
        <TableFilters {...bar} placeholder="Nom, e-mail, téléphone, matricule…" />
        {filtered.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-gray-400">Aucun compte ne correspond.</p>
        ) : (
          <div className={CARD_GRID}>
            {filtered.map((user) => (
              <PersonCard
                key={user.userId}
                name={user.name}
                subtitle={roleLabel(user)}
                badge={
                  user.loyaltyTier ? (
                    <span className="rounded-full bg-gold/20 px-2.5 py-0.5 text-[12px] font-semibold text-navy-800">{user.loyaltyTier}</span>
                  ) : undefined
                }
                headline={
                  <>
                    <span>{user.phone ?? "Téléphone non renseigné"}</span>
                    <span className="truncate text-navy-700/60">{user.email}</span>
                  </>
                }
                actions={
                  <>
                    <Link href={`${basePath}/${user.userId}`} className="text-xs font-semibold text-navy-700 hover:underline">
                      Modifier
                    </Link>
                    <button type="button" className="text-xs font-semibold text-rose hover:underline" onClick={() => setDeleteTarget(user)}>
                      Supprimer
                    </button>
                  </>
                }
                facts={[
                  { label: "E-mail", value: user.email },
                  { label: "Téléphone", value: user.phone ?? "—" },
                  { label: "Rôle", value: roleLabel(user) },
                  ...(user.customRoleName ? [{ label: "Rôle personnalisé", value: user.customRoleName }] : []),
                  { label: "Matricule fiscal", value: user.matriculeFiscal || "—" },
                  { label: "Adresse de l’agence", value: user.agencyAddress || "—" },
                  { label: "Points de fidélité", value: user.loyaltyPoints != null ? String(user.loyaltyPoints) : "—" },
                  { label: "CGU acceptées", value: user.termsAcceptedAt ? new Date(user.termsAcceptedAt).toLocaleDateString("fr-FR") : "—" },
                ]}
              />
            ))}
          </div>
        )}
      </div>

      {deleteTarget && (
        <Modal title="Confirmer la suppression" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-navy-700/80">
            Supprimer <strong>{deleteTarget.name}</strong> ? Ses réservations sont conservées et détachées du compte.
          </p>
          {error && (
            <div className="mt-3 rounded-[10px] border border-rose/25 bg-rose/8 px-4 py-3 text-[13px] text-rose">{error}</div>
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
