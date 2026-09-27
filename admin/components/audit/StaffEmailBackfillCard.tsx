"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import { readApiError } from "@/lib/apiError";
import { useToast } from "@/components/Toast";

/**
 * A one-off tool: the "confirmed" team e-mail (see StaffBookingNotifier) only started existing on
 * 27 Sep 2026, so reservations confirmed before then never got one. This sends it now, for
 * traceability - safe to click more than once, a reservation it already covered is never mailed twice.
 */
export default function StaffEmailBackfillCard() {
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    const res = await fetch("/api/proxy/reservations/backfill-staff-confirmation-emails", { method: "POST" });
    setBusy(false);
    setConfirming(false);
    if (!res.ok) {
      toast.error(await readApiError(res, "Envoi refusé par le serveur"));
      return;
    }
    const { considered, sent } = (await res.json()) as { considered: number; sent: number };
    if (considered === 0) {
      toast.success("Aucune réservation confirmée du site à traiter.");
    } else if (sent === 0) {
      toast.success(`${considered} réservation(s) concernée(s), déjà toutes envoyées auparavant.`);
    } else {
      toast.success(`E-mail envoyé pour ${sent} réservation(s) sur ${considered} concernée(s).`);
    }
  }

  return (
    <>
      <div className="card flex flex-wrap items-center justify-between gap-3 rounded-2xl p-5">
        <div>
          <h2 className="text-sm font-bold text-navy-800">Traçabilité — réservations déjà confirmées</h2>
          <p className="mt-1 max-w-2xl text-[13px] text-navy-700/55">
            Envoie l’e-mail « réservation confirmée » à l’équipe pour les réservations du site déjà confirmées,
            arrivées ou terminées avant la mise en place de cet e-mail. Sans risque de doublon : une réservation
            déjà couverte n’est jamais renvoyée.
          </p>
        </div>
        <button type="button" className="btn btn-secondary shrink-0" onClick={() => setConfirming(true)}>
          Envoyer l’e-mail de traçabilité
        </button>
      </div>

      {confirming && (
        <Modal title="Envoyer l’e-mail de traçabilité" onClose={() => (busy ? undefined : setConfirming(false))}>
          <p className="text-sm text-navy-700/80">
            Un e-mail « réservation confirmée » sera envoyé à l’équipe pour chaque réservation du site actuellement
            confirmée, arrivée ou terminée qui n’en a pas encore reçu. Continuer ?
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => setConfirming(false)}>
              Annuler
            </button>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={run}>
              {busy ? "Envoi…" : "Envoyer"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
