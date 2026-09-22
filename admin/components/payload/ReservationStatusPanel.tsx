"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { inputClass, labelClass } from "@/components/payload/fields";

/**
 * The only place in this app that changes a reservation's status. Calls the
 * backend's single shared transition endpoint (PATCH /api/reservations/
 * {id}/status -> ReservationServiceImpl.updateReservationStatus ->
 * ReservationStateMachine) — the same one place on the backend that ever
 * writes reservation.status, so the confirmation/payment-link email can
 * never be forgotten or double-sent. This panel does not decide what's
 * allowed; a move the state machine rejects comes back as a 422 with a
 * human-readable reason, shown as-is via the toast.
 *
 * Payment link: purely a text field. No generation, no validation beyond
 * "did staff type something" — if left blank, the backend already falls
 * back to the plain "confirmed, we'll follow up" email instead of a
 * broken/empty payment button (see EmailService.sendReservationAcceptedEmail
 * vs sendReservationConfirmedPaymentEmail).
 */
export default function ReservationStatusPanel({
  reservationId,
  status,
  paymentLink: initialPaymentLink,
}: {
  reservationId: string;
  status: string;
  paymentLink: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [paymentLink, setPaymentLink] = useState(initialPaymentLink ?? "");
  const [busy, setBusy] = useState(false);

  async function transition(nextStatus: "CONFIRMED" | "CANCELLED", link?: string) {
    setBusy(true);
    const params = new URLSearchParams({ status: nextStatus });
    if (link && link.trim()) params.set("link", link.trim());

    const res = await fetch(`/api/proxy/reservations/${reservationId}/status?${params}`, {
      method: "PATCH",
    });
    setBusy(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.message ?? "Impossible de mettre à jour le statut.");
      return;
    }

    toast.success(
      nextStatus === "CONFIRMED" ? "Réservation confirmée — email envoyé au client" : "Réservation annulée",
    );
    router.refresh();
  }

  if (status === "PENDING") {
    return (
      <div className="card rounded-2xl p-5">
        <h3 className="text-[13px] font-bold uppercase tracking-wide text-navy-700/50">Statut</h3>
        <p className="mt-1 text-[12px] text-navy-700/45">
          Confirmer envoie immédiatement l&apos;email de confirmation au client — avec le lien de paiement
          ci-dessous si renseigné, sinon un email l&apos;informant que l&apos;équipe le recontactera.
        </p>

        <div className="mt-3 flex flex-col gap-1">
          <label className={labelClass}>Lien de paiement (optionnel)</label>
          <input
            className={inputClass}
            placeholder="https://..."
            value={paymentLink}
            onChange={(e) => setPaymentLink(e.target.value)}
            disabled={busy}
          />
        </div>

        <div className="mt-4 flex gap-3">
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() => transition("CONFIRMED", paymentLink)}
          >
            Confirmer
          </button>
          <button
            type="button"
            className="text-rose hover:underline disabled:opacity-40"
            disabled={busy}
            onClick={() => transition("CANCELLED")}
          >
            Annuler la réservation
          </button>
        </div>
      </div>
    );
  }

  if (status === "CONFIRMED") {
    return (
      <div className="card rounded-2xl p-5">
        <h3 className="text-[13px] font-bold uppercase tracking-wide text-navy-700/50">Statut</h3>
        <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-[13px] text-emerald-800">
          Confirmée{initialPaymentLink ? " — lien de paiement envoyé au client." : "."}
        </p>
        <button
          type="button"
          className="mt-3 text-rose hover:underline disabled:opacity-40"
          disabled={busy}
          onClick={() => transition("CANCELLED")}
        >
          Annuler la réservation
        </button>
      </div>
    );
  }

  return null;
}
