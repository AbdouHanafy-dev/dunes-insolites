"use client";

import { readApiError } from "@/lib/apiError";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";
import type { AdminNewsletterSubscriber } from "@/lib/api";

/**
 * Read/delete (no create/edit — subscribers sign up from the launch
 * countdown page, see frontend/components/MaintenanceNotifyForm.tsx, not
 * from the admin) plus the one-click launch announcement. Bespoke rather
 * than CollectionList/CollectionEditor: this isn't CRUD, it's a list and
 * a single broadcast action.
 */
export function NewsletterList({ initialItems }: { initialItems: AdminNewsletterSubscriber[] }) {
  const router = useRouter();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminNewsletterSubscriber | null>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resendingId, setResendingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return initialItems;
    const q = query.toLowerCase();
    return initialItems.filter((i) => i.email.toLowerCase().includes(q));
  }, [initialItems, query]);

  const pendingCount = initialItems.filter((i) => !i.launchEmailSentAt).length;

  async function onSend() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/proxy/newsletter-subscribers/send-launch-email", { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      const message = await readApiError(res, "Envoi impossible");
      setError(message);
      toast.error(message);
      return;
    }
    const body = (await res.json()) as { sent: number; failed: number };
    setConfirmOpen(false);
    if (body.failed > 0) {
      toast.error(
        `${body.sent} envoyé(s), ${body.failed} échec(s) — vérifiez la configuration SMTP. Les échecs restent en attente pour le prochain envoi.`,
      );
    } else {
      toast.success(
        body.sent > 0
          ? `Email de lancement envoyé à ${body.sent} abonné(s).`
          : "Tout le monde a déjà reçu l'email de lancement.",
      );
    }
    router.refresh();
  }

  async function onDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/proxy/newsletter-subscribers/${deleteTarget.id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const message = await readApiError(res, "Suppression impossible");
      setError(message);
      toast.error(message);
      return;
    }
    toast.success("Adresse supprimée de la newsletter.");
    setDeleteTarget(null);
    router.refresh();
  }

  async function onResend(item: AdminNewsletterSubscriber) {
    setResendingId(item.id);
    const res = await fetch(`/api/proxy/newsletter-subscribers/${item.id}/resend-launch-email`, {
      method: "POST",
    });
    setResendingId(null);
    if (!res.ok) {
      toast.error(await readApiError(res, `Renvoi impossible pour ${item.email}`));
      return;
    }
    toast.success(`Email de lancement renvoyé à ${item.email}.`);
    router.refresh();
  }

  async function onDeleteAll() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/proxy/newsletter-subscribers", { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const message = await readApiError(res, "Suppression de la liste impossible");
      setError(message);
      toast.error(message);
      return;
    }
    toast.success("Toutes les adresses ont été supprimées.");
    setDeleteAllOpen(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-navy-800">Newsletter</h1>
          <p className="mt-1 text-sm text-navy-700/55">
            {initialItems.length} abonné(s) · {pendingCount} en attente de l&apos;email de lancement
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setError("");
              setDeleteAllOpen(true);
            }}
            disabled={initialItems.length === 0}
            className="btn btn-danger-outline"
          >
            Supprimer tout
          </button>
          <button
            onClick={() => {
              setError("");
              setConfirmOpen(true);
            }}
            disabled={pendingCount === 0}
            className="btn btn-primary"
            title={pendingCount === 0 ? "Tout le monde a déjà reçu l'email" : undefined}
          >
            <i className="bi bi-send mr-2" aria-hidden />Envoyer l&apos;email de lancement
          </button>
        </div>
      </div>

      <input
        type="text"
        placeholder="Rechercher un email…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full max-w-sm rounded-[9px] border border-navy-700/15 bg-white px-3.5 py-2.5 text-[14px] text-navy-800 outline-none transition placeholder:text-navy-700/30 focus:border-gold/60 focus:ring-3 focus:ring-gold/15"
      />

      <div className="card overflow-hidden rounded-2xl">
        {filtered.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-gray-400">Aucun abonné pour le moment.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400">
                  <th className="px-6 py-3 font-medium">Email</th>
                  <th className="px-6 py-3 font-medium">Inscrit le</th>
                  <th className="px-6 py-3 font-medium">Email de lancement</th>
                  <th className="px-6 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-3 text-gray-700">{item.email}</td>
                    <td className="px-6 py-3 text-gray-700">
                      {new Date(item.subscribedAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
                    </td>
                    <td className="px-6 py-3">
                      {item.launchEmailSentAt ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald/12 px-2.5 py-1 text-[12px] font-semibold text-emerald">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald" />
                          Envoyé le {new Date(item.launchEmailSentAt).toLocaleDateString("fr-FR")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-navy-700/8 px-2.5 py-1 text-[12px] font-semibold text-navy-700/60">
                          <span className="h-1.5 w-1.5 rounded-full bg-navy-700/40" />
                          En attente
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => onResend(item)}
                          disabled={resendingId === item.id}
                          className="btn btn-secondary btn-sm"
                          title={item.launchEmailSentAt ? "Renvoyer, même déjà envoyé" : "Envoyer à cette seule adresse"}
                        >
                          {resendingId === item.id ? "…" : "Renvoyer"}
                        </button>
                        <button
                          onClick={() => {
                            setError("");
                            setDeleteTarget(item);
                          }}
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

      {confirmOpen && (
        <Modal title="Envoyer l'email de lancement" onClose={() => setConfirmOpen(false)}>
          <p className="text-sm text-navy-700/80">
            Le site est prêt et vous allez prévenir <strong>{pendingCount}</strong> abonné(s) par email
            qu&apos;il est maintenant ouvert. Cette action ne peut pas être annulée et ne renverra jamais
            l&apos;email à quelqu&apos;un qui l&apos;a déjà reçu.
          </p>
          {error && (
            <div className="mt-3 rounded-[10px] border border-rose/25 bg-rose/8 px-4 py-3 text-[13px] text-rose">
              {error}
            </div>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setConfirmOpen(false)} className="btn btn-secondary">
              Annuler
            </button>
            <button onClick={onSend} disabled={busy} className="btn btn-primary">
              {busy ? "Envoi…" : `Envoyer à ${pendingCount} abonné(s)`}
            </button>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Supprimer une adresse" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-navy-700/80">
            Supprimer <strong>{deleteTarget.email}</strong> de la newsletter ? Cette action est irréversible.
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

      {deleteAllOpen && (
        <Modal title="Supprimer toute la liste" onClose={() => setDeleteAllOpen(false)}>
          <p className="text-sm text-navy-700/80">
            Supprimer définitivement les <strong>{initialItems.length}</strong> adresse(s) de la newsletter ?
            L&apos;historique d&apos;envoi sera également supprimé.
          </p>
          {error && (
            <div className="mt-3 rounded-[10px] border border-rose/25 bg-rose/8 px-4 py-3 text-[13px] text-rose">
              {error}
            </div>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setDeleteAllOpen(false)} className="btn btn-secondary">
              Annuler
            </button>
            <button onClick={onDeleteAll} disabled={busy} className="btn btn-danger">
              {busy ? "Suppression…" : `Supprimer les ${initialItems.length} adresses`}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
