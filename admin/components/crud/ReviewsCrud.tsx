"use client";

import { readApiError } from "@/lib/apiError";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";
import type { AdminReview } from "@/lib/api";
import TableFilters from "@/components/TableFilters";
import { useTableFilters } from "@/components/useTableFilters";

const PRODUCT_LABEL: Record<AdminReview["productType"], string> = {
  TOURTYPE: "Hébergement",
  TOUR: "Circuit",
  EXTRA: "Extra",
};

/**
 * Read + delete (moderation) only — there is no admin-facing "create" here.
 * POST /api/reviews always attributes the review to the caller's own JWT
 * identity, so a staff member entering a real review copied from GetYourGuide
 * or Airbnb would show up as written by their own admin account, not the
 * actual guest. That's a real gap (see ARCHITECTURE.md/roadmap) — fixing it
 * needs a backend field for an external author name/source, not built yet.
 * Moderating (removing) reviews that are already in the system is safe and
 * real, so that's what this section does.
 */
export function ReviewsList({ initialItems }: { initialItems: AdminReview[] }) {
  const router = useRouter();
  const toast = useToast();
  const [deleteTarget, setDeleteTarget] = useState<AdminReview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const { filtered, bar } = useTableFilters(
    initialItems,
    [
      { id: "rating", label: "Note", kind: "select", options: [5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: "★".repeat(n) })), get: (r) => String(r.rating) },
      { id: "product", label: "Produit", kind: "select", options: Object.entries(PRODUCT_LABEL).map(([value, label]) => ({ value, label })), get: (r) => r.productType },
      { id: "date", label: "Date", kind: "date", get: (r) => r.createdAt },
    ],
    (r) => [r.userName, r.comment, PRODUCT_LABEL[r.productType]],
  );

  async function onDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    const res = await fetch(`/api/proxy/reviews/${deleteTarget.reviewId}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const message = await readApiError(res, "Suppression impossible");
      setError(message);
      toast.error(message);
      return;
    }
    toast.success("Supprimé avec succès");
    setDeleteTarget(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-navy-800">Avis clients</h1>
        <p className="mt-1 text-sm text-navy-700/55">
          {initialItems.length} avis · modération uniquement — la publication d&apos;un vrai avis
          externe (GetYourGuide, Airbnb…) au nom du client se fait encore à la main côté
          contenu, pas depuis cette liste.
        </p>
      </div>

      <div className="card overflow-hidden rounded-2xl">
        <TableFilters {...bar} placeholder="Client, commentaire…" />
        {filtered.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-gray-400">Aucun avis pour le moment.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-700/8 bg-navy-700/[0.025] text-left text-[11px] uppercase tracking-wide text-navy-700/55">
                  <th className="px-6 py-3 font-semibold">Client</th>
                  <th className="px-6 py-3 font-semibold">Produit</th>
                  <th className="px-6 py-3 font-semibold">Note</th>
                  <th className="px-6 py-3 font-semibold">Commentaire</th>
                  <th className="px-6 py-3 font-semibold">Date</th>
                  <th className="px-6 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((r) => (
                  <tr key={r.reviewId} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-gray-700">{r.userName}</td>
                    <td className="px-6 py-3 text-gray-700">{PRODUCT_LABEL[r.productType]}</td>
                    <td className="px-6 py-3 text-gray-700">{"★".repeat(r.rating)}</td>
                    <td className="max-w-xs truncate px-6 py-3 text-gray-700">{r.comment || "—"}</td>
                    <td className="px-6 py-3 text-gray-500">
                      {new Date(r.createdAt).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button onClick={() => setDeleteTarget(r)} className="btn btn-danger-outline btn-sm">
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {deleteTarget && (
        <Modal title="Confirmer la suppression" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-navy-700/80">
            Supprimer l&apos;avis de <strong>{deleteTarget.userName}</strong> ? Cette action est
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
