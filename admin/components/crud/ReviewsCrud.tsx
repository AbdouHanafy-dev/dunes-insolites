"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Modal from "@/components/Modal";
import type { AdminReview } from "@/lib/api";

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
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AdminReview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return initialItems;
    const q = query.toLowerCase();
    return initialItems.filter(
      (r) => r.userName.toLowerCase().includes(q) || (r.comment ?? "").toLowerCase().includes(q),
    );
  }, [initialItems, query]);

  async function onDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    const res = await fetch(`/api/proxy/reviews/${deleteTarget.reviewId}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      setError("Suppression impossible.");
      return;
    }
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

      <input
        type="text"
        placeholder="Rechercher…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full max-w-sm rounded-[9px] border border-navy-700/15 bg-white px-3.5 py-2.5 text-[14px] text-navy-800 outline-none transition placeholder:text-navy-700/30 focus:border-gold/60 focus:ring-3 focus:ring-gold/15"
      />

      <div className="card overflow-hidden rounded-2xl">
        {filtered.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-gray-400">Aucun avis pour le moment.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400">
                  <th className="px-6 py-3 font-medium">Client</th>
                  <th className="px-6 py-3 font-medium">Produit</th>
                  <th className="px-6 py-3 font-medium">Note</th>
                  <th className="px-6 py-3 font-medium">Commentaire</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 text-right font-medium">Actions</th>
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
                      <button
                        onClick={() => setDeleteTarget(r)}
                        className="rounded-md border border-rose/25 px-2.5 py-1 text-xs font-medium text-rose hover:bg-rose/8"
                      >
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
            <button
              onClick={() => setDeleteTarget(null)}
              className="rounded-lg border border-navy-700/15 px-4 py-2.5 text-sm font-medium text-navy-700 hover:bg-navy-700/5"
            >
              Annuler
            </button>
            <button
              onClick={onDelete}
              disabled={busy}
              className="rounded-lg bg-rose px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {busy ? "Suppression…" : "Supprimer"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
