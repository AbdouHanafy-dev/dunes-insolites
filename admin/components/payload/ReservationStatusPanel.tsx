"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { inputClass, labelClass } from "@/components/payload/fields";
import { statusOf } from "@/components/reservations/reservationStatus";

/**
 * The only place in this app that changes a reservation's status. Calls the
 * backend's single shared transition endpoint (PATCH /api/reservations/
 * {id}/status -> ReservationServiceImpl.updateReservationStatus ->
 * ReservationStateMachine) — the same one place on the backend that ever
 * writes reservation.status, so the confirmation/payment-link email can
 * never be forgotten or double-sent. This panel does not decide what's
 * allowed beyond mirroring the state machine's graph to decide which
 * buttons to offer; a move the state machine rejects comes back as a 422
 * with a human-readable reason, shown as-is via the toast.
 *
 * Graph mirrored from ReservationStateMachine:
 *   PENDING    -> CONFIRMED | REJECTED | CANCELLED
 *   CONFIRMED  -> CHECKED_IN | COMPLETED | CANCELLED
 *   CHECKED_IN -> COMPLETED
 *   CANCELLED / REJECTED / COMPLETED / EXPIRED are terminal.
 * (EXPIRED is set by the hold-expiry job only, never from here.)
 *
 * Payment link: purely a text field. No generation, no validation beyond
 * "did staff type something" — if left blank, the backend already falls
 * back to the plain "confirmed, we'll follow up" email instead of a
 * broken/empty payment button (see EmailService.sendReservationAcceptedEmail
 * vs sendReservationConfirmedPaymentEmail).
 */
type Target = "CONFIRMED" | "REJECTED" | "CANCELLED" | "CHECKED_IN" | "COMPLETED";

const NEXT: Record<string, Target[]> = {
  PENDING: ["CONFIRMED", "REJECTED", "CANCELLED"],
  CONFIRMED: ["CHECKED_IN", "COMPLETED", "CANCELLED"],
  CHECKED_IN: ["COMPLETED"],
};

const ACTIONS: Record<Target, { label: string; icon: string; button: string; success: string; confirm?: string }> = {
  CONFIRMED: {
    label: "Confirmer",
    icon: "bi-check-circle",
    button: "btn btn-primary",
    success: "Réservation confirmée — email envoyé au client",
  },
  CHECKED_IN: {
    label: "Marquer comme arrivée",
    icon: "bi-box-arrow-in-right",
    button: "btn btn-secondary",
    success: "Client arrivé",
  },
  COMPLETED: {
    label: "Terminer",
    icon: "bi-flag",
    button: "btn btn-secondary",
    success: "Réservation terminée",
    confirm: "Marquer cette réservation comme terminée ? Le client en est informé et la réservation ne pourra plus être modifiée.",
  },
  REJECTED: {
    label: "Refuser",
    icon: "bi-x-circle",
    button: "btn btn-danger-outline",
    success: "Réservation refusée",
    confirm: "Refuser cette réservation ? Le client en est informé et la place est libérée.",
  },
  CANCELLED: {
    label: "Annuler",
    icon: "bi-slash-circle",
    button: "btn btn-danger-outline",
    success: "Réservation annulée",
    confirm: "Annuler cette réservation ? La place est libérée et la réservation ne pourra plus être modifiée.",
  },
};

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
  const [reason, setReason] = useState("");
  const [asking, setAsking] = useState<Target | null>(null);
  const [busy, setBusy] = useState(false);

  const current = statusOf(status);
  const targets = NEXT[status] ?? [];

  async function transition(next: Target) {
    setBusy(true);
    const params = new URLSearchParams({ status: next });
    if (next === "CONFIRMED" && paymentLink.trim()) params.set("link", paymentLink.trim());
    if (next === "REJECTED" && reason.trim()) params.set("rejectionReason", reason.trim());

    const res = await fetch(`/api/proxy/reservations/${reservationId}/status?${params}`, {
      method: "PATCH",
    });
    setBusy(false);
    setAsking(null);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.message ?? "Impossible de mettre à jour le statut.");
      return;
    }

    toast.success(ACTIONS[next].success);
    router.refresh();
  }

  function onClick(t: Target) {
    if (ACTIONS[t].confirm) setAsking(t);
    else transition(t);
  }

  return (
    <div className="card rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[13px] font-bold uppercase tracking-wide text-navy-700/50">Statut</h3>
        <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-medium ${current.className}`}>{current.label}</span>
      </div>

      {targets.length === 0 ? (
        <p className="mt-2 text-[13px] text-navy-700/55">
          Cette réservation est {current.label.toLowerCase()} — son statut ne peut plus changer.
        </p>
      ) : (
        <>
          {status === "PENDING" && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Lien de paiement (optionnel, pour confirmer)</label>
                <input
                  className={inputClass}
                  placeholder="https://..."
                  value={paymentLink}
                  onChange={(e) => setPaymentLink(e.target.value)}
                  disabled={busy}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Motif (optionnel, pour refuser)</label>
                <input
                  className={inputClass}
                  placeholder="Ex. complet à ces dates"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={busy}
                />
              </div>
              <p className="text-[12px] text-navy-700/45 sm:col-span-2">
                Confirmer envoie immédiatement l&apos;email de confirmation au client — avec le lien de paiement
                si renseigné, sinon un email l&apos;informant que l&apos;équipe le recontactera.
              </p>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {targets.map((t) => (
              <button key={t} type="button" className={ACTIONS[t].button} disabled={busy} onClick={() => onClick(t)}>
                <i className={`bi ${ACTIONS[t].icon}`} aria-hidden />
                {ACTIONS[t].label}
              </button>
            ))}
          </div>
        </>
      )}

      {asking && (
        <Modal title={ACTIONS[asking].label} onClose={() => (busy ? undefined : setAsking(null))}>
          <p className="text-sm text-navy-700/80">{ACTIONS[asking].confirm}</p>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => setAsking(null)}>
              Retour
            </button>
            <button
              type="button"
              className={asking === "COMPLETED" ? "btn btn-primary" : "btn btn-danger"}
              disabled={busy}
              onClick={() => transition(asking)}
            >
              {busy ? "…" : ACTIONS[asking].label}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
