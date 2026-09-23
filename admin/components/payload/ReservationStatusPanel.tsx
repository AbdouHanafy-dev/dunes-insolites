"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { inputClass, labelClass } from "@/components/payload/fields";
import { statusOf } from "@/components/reservations/reservationStatus";
import { suggestedDeposit } from "@/components/reservations/paymentSuggest";
import type { AdminPaymentPolicy } from "@/lib/api";

/**
 * The only place in this app that changes a reservation's status. Calls the
 * backend's single shared transition endpoint (PATCH /api/reservations/
 * {id}/status -> ReservationServiceImpl.updateReservationStatus ->
 * ReservationStateMachine) — the same one place on the backend that ever
 * writes reservation.status, so the confirmation email can never be forgotten
 * or double-sent. This panel does not decide what's allowed beyond mirroring
 * the state machine's graph to decide which buttons to offer; a move the
 * state machine rejects comes back as a 422 with a human-readable reason,
 * shown as-is via the toast.
 *
 * Graph mirrored from ReservationStateMachine:
 *   PENDING    -> CONFIRMED | REJECTED | CANCELLED
 *   CONFIRMED  -> CHECKED_IN | COMPLETED | CANCELLED
 *   CHECKED_IN -> COMPLETED
 *   CANCELLED / REJECTED / COMPLETED / EXPIRED are terminal.
 * (EXPIRED is set by the hold-expiry job only, never from here.)
 *
 * Confirming is the one move that emails the client (in the language they
 * booked in): a single message that confirms the booking and says what to pay
 * now, by when and how. The amount and link are chosen here, saved on the
 * reservation (PUT .../payment-terms), and then the status changes.
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
  total,
  currency,
  policy,
  paymentLink: initialLink,
  depositAmount,
}: {
  reservationId: string;
  status: string;
  total: number;
  currency: string;
  policy: AdminPaymentPolicy | null;
  paymentLink: string | null;
  depositAmount: number | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [reason, setReason] = useState("");
  const [asking, setAsking] = useState<Target | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [amount, setAmount] = useState("");
  const [link, setLink] = useState(initialLink ?? "");
  const [busy, setBusy] = useState(false);

  const current = statusOf(status);
  const targets = NEXT[status] ?? [];

  function openConfirm() {
    setAmount(String(depositAmount ?? suggestedDeposit(policy, total)));
    setLink(initialLink ?? "");
    setConfirming(true);
  }

  async function fail(res: Response, fallback: string) {
    const data = await res.json().catch(() => ({}));
    toast.error(data.message ?? fallback);
  }

  async function transition(next: Target) {
    setBusy(true);
    const params = new URLSearchParams({ status: next });
    if (next === "REJECTED" && reason.trim()) params.set("rejectionReason", reason.trim());

    const res = await fetch(`/api/proxy/reservations/${reservationId}/status?${params}`, {
      method: "PATCH",
    });
    setBusy(false);
    setAsking(null);

    if (!res.ok) {
      await fail(res, "Impossible de mettre à jour le statut.");
      return;
    }

    toast.success(ACTIONS[next].success);
    router.refresh();
  }

  async function confirmWithTerms(e: React.FormEvent) {
    e.preventDefault();
    const value = amount.trim() === "" ? null : Number(amount);
    if (value !== null && (!Number.isFinite(value) || value < 0 || value > total)) {
      toast.error(`Le montant doit être compris entre 0 et ${total} ${currency}.`);
      return;
    }

    setBusy(true);
    const terms = await fetch(`/api/proxy/reservations/${reservationId}/payment-terms`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentLink: link.trim() || null, amount: value }),
    });
    if (!terms.ok) {
      setBusy(false);
      await fail(terms, "Impossible d'enregistrer les modalités de paiement.");
      return;
    }
    const res = await fetch(`/api/proxy/reservations/${reservationId}/status?status=CONFIRMED`, { method: "PATCH" });
    setBusy(false);
    if (!res.ok) {
      await fail(res, "Impossible de confirmer la réservation.");
      return;
    }
    setConfirming(false);
    toast.success(ACTIONS.CONFIRMED.success);
    router.refresh();
  }

  function onClick(t: Target) {
    if (t === "CONFIRMED") openConfirm();
    else if (ACTIONS[t].confirm) setAsking(t);
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
            <div className="mt-3 flex flex-col gap-1">
              <label className={labelClass}>Motif (optionnel, pour refuser)</label>
              <input
                className={inputClass}
                placeholder="Ex. complet à ces dates"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={busy}
              />
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

      {confirming && (
        <Modal title="Confirmer la réservation" onClose={() => (busy ? undefined : setConfirming(false))}>
          <form onSubmit={confirmWithTerms} className="flex flex-col gap-4">
            <p className="text-sm text-navy-700/80">
              Le client reçoit un email de confirmation, dans la langue de sa réservation, avec ce qu&apos;il doit
              régler maintenant. Le reste se paie sur place selon les moyens acceptés dans Paramètres.
            </p>
            <div className="flex flex-col gap-1">
              <label htmlFor="cf-amount" className={labelClass}>
                À payer maintenant ({currency}) — 0 pour ne rien demander à l&apos;avance
              </label>
              <input
                id="cf-amount"
                type="number"
                min={0}
                max={total}
                step="0.001"
                className={inputClass}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={busy}
              />
              <p className="text-[12px] text-navy-700/45">
                Total de la réservation : {total} {currency}. Proposé d&apos;après les règles de paiement, modifiable.
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="cf-link" className={labelClass}>Lien de paiement (optionnel)</label>
              <input
                id="cf-link"
                className={inputClass}
                placeholder="https://..."
                value={link}
                onChange={(e) => setLink(e.target.value)}
                disabled={busy}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => setConfirming(false)}>
                Retour
              </button>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                <i className="bi bi-send" aria-hidden />
                {busy ? "Envoi…" : "Confirmer et envoyer l'email"}
              </button>
            </div>
          </form>
        </Modal>
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
