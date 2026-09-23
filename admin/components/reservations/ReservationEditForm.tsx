"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { inputClass, labelClass } from "@/components/payload/fields";
import type { AdminReservationDetail, AdminSpokenLanguage } from "@/lib/api";

/**
 * Edits the fields PUT /api/reservations/{id} accepts without touching
 * pricing: dates, party size, group details, special request, preferred
 * languages. Extras, accommodation tiers and participants are deliberately
 * not here - the server reprices those, and that belongs in its own flow.
 *
 * Two server rules worth knowing (ReservationServiceImpl.updateReservation):
 *  - CHECKED_IN / COMPLETED / CANCELLED reservations cannot be edited (the
 *    form is not rendered for them by the page);
 *  - saving an edit on a CONFIRMED or REJECTED reservation moves it back to
 *    PENDING for re-confirmation, and notifies admins. The warning below is
 *    shown for CONFIRMED so that never comes as a surprise.
 *
 * Party size only changes prices when the stay line is re-submitted, so the
 * counts are editable only when there is exactly one stay line (the server
 * then applies the group counts to it and keeps the accommodation snapshot).
 */
export default function ReservationEditForm({
  reservation,
  languages,
}: {
  reservation: AdminReservationDetail;
  languages: AdminSpokenLanguage[];
}) {
  const router = useRouter();
  const toast = useToast();

  const isStay = reservation.reservationType === "HEBERGEMENT";
  const stayLine = reservation.tourTypes.length === 1 ? reservation.tourTypes[0] : null;
  const canEditParty = isStay && stayLine?.catalogTourTypeId != null && stayLine.activityDate != null;

  const [checkIn, setCheckIn] = useState(reservation.checkInDate ?? "");
  const [checkOut, setCheckOut] = useState(reservation.checkOutDate ?? "");
  const [serviceDate, setServiceDate] = useState(reservation.serviceDate ?? "");
  const [adults, setAdults] = useState(reservation.numberOfAdults ?? 0);
  const [children, setChildren] = useState(reservation.numberOfChildren ?? 0);
  const [groupName, setGroupName] = useState(reservation.groupName ?? "");
  const [leader, setLeader] = useState(reservation.groupLeaderName ?? "");
  const [special, setSpecial] = useState(reservation.demandeSpecial ?? "");
  const [otherLanguage, setOtherLanguage] = useState(reservation.otherLanguageRequested ?? "");
  const [languageIds, setLanguageIds] = useState<string[]>(reservation.preferredLanguages.map((l) => l.languageId));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const partyChanged =
    adults !== (reservation.numberOfAdults ?? 0) || children !== (reservation.numberOfChildren ?? 0);

  function toggleLanguage(id: string) {
    setLanguageIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (isStay) {
      if (!checkIn || !checkOut || Date.parse(checkOut) <= Date.parse(checkIn)) {
        setError("La date de départ doit être après la date d'arrivée.");
        return;
      }
    } else if (!serviceDate && reservation.serviceDate) {
      setError("La date de départ du circuit est requise.");
      return;
    }

    const body: Record<string, unknown> = {
      groupName: groupName.trim(),
      groupLeaderName: leader.trim(),
      demandeSpecial: special.trim(),
      otherLanguageRequested: otherLanguage.trim(),
      preferredLanguageIds: languageIds,
    };
    if (isStay) {
      body.checkInDate = checkIn;
      body.checkOutDate = checkOut;
    } else if (serviceDate) {
      body.serviceDate = serviceDate;
    }
    if (canEditParty) {
      body.numberOfAdults = adults;
      body.numberOfChildren = children;
      // Re-submitting the line is what makes the server apply the new counts
      // to it; with a single line it uses the group counts, and carries the
      // accommodation snapshot forward unchanged.
      if (partyChanged && stayLine) {
        body.tourTypes = [{ tourTypeId: stayLine.catalogTourTypeId, activityDate: stayLine.activityDate }];
      }
    }

    setBusy(true);
    const res = await fetch(`/api/proxy/reservations/${reservation.reservationId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const message =
        res.status === 403
          ? "Votre rôle ne permet pas de modifier une réservation."
          : (data.message ?? "Modification impossible — vérifiez les disponibilités et réessayez.");
      setError(message);
      toast.error(message);
      return;
    }

    toast.success(
      reservation.status === "CONFIRMED" ? "Réservation modifiée — repassée en attente" : "Réservation modifiée",
    );
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="card flex flex-col gap-4 rounded-2xl p-5">
      <h3 className="text-[13px] font-bold uppercase tracking-wide text-navy-700/50">Modifier la réservation</h3>

      {reservation.status === "CONFIRMED" && (
        <p className="flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
          <i className="bi bi-exclamation-triangle mt-0.5" aria-hidden />
          <span>
            Enregistrer une modification repasse cette réservation confirmée en <strong>En attente</strong> : elle
            devra être reconfirmée.
          </span>
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {isStay ? (
          <>
            <label className="flex flex-col gap-1">
              <span className={labelClass}>Arrivée</span>
              <input type="date" className={inputClass} value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelClass}>Départ</span>
              <input type="date" className={inputClass} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
            </label>
          </>
        ) : (
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Date de départ</span>
            <input
              type="date"
              className={inputClass}
              value={serviceDate}
              onChange={(e) => setServiceDate(e.target.value)}
            />
          </label>
        )}
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Adultes</span>
          <input
            type="number"
            min={0}
            className={inputClass}
            value={adults}
            disabled={!canEditParty}
            onChange={(e) => setAdults(Number(e.target.value))}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Enfants</span>
          <input
            type="number"
            min={0}
            className={inputClass}
            value={children}
            disabled={!canEditParty}
            onChange={(e) => setChildren(Number(e.target.value))}
          />
        </label>
      </div>
      {!canEditParty && (
        <p className="-mt-2 text-[12px] text-navy-700/45">
          Le nombre de personnes n&apos;est modifiable que pour une nuitée à une seule ligne — il pilote le prix, que
          le serveur recalcule.
        </p>
      )}
      {canEditParty && partyChanged && (
        <p className="-mt-2 text-[12px] text-navy-700/55">
          Le prix par personne est recalculé par le serveur à l&apos;enregistrement.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Nom du groupe</span>
          <input className={inputClass} value={groupName} onChange={(e) => setGroupName(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Responsable du groupe</span>
          <input className={inputClass} value={leader} onChange={(e) => setLeader(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className={labelClass}>Demande spéciale</span>
          <textarea
            className={`${inputClass} min-h-20`}
            value={special}
            onChange={(e) => setSpecial(e.target.value)}
          />
        </label>
      </div>

      {languages.length > 0 && (
        <fieldset className="flex flex-col gap-2">
          <legend className={labelClass}>Langue(s) préférée(s) du client</legend>
          <div className="flex flex-wrap gap-2">
            {languages.map((l) => {
              const on = languageIds.includes(l.languageId);
              return (
                <button
                  key={l.languageId}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleLanguage(l.languageId)}
                  className={`rounded-full border px-3 py-1 text-[13px] transition ${
                    on
                      ? "border-gold bg-gold/15 font-medium text-navy-800"
                      : "border-navy-700/15 text-navy-700/65 hover:border-navy-700/30"
                  }`}
                >
                  {l.name}
                </button>
              );
            })}
          </div>
          <input
            className={inputClass}
            placeholder="Autre langue (texte libre)"
            value={otherLanguage}
            onChange={(e) => setOtherLanguage(e.target.value)}
          />
        </fieldset>
      )}

      {error && (
        <div className="rounded-[10px] border border-rose/25 bg-rose/8 px-4 py-3 text-[13px] text-rose">{error}</div>
      )}

      <div className="flex justify-end">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Enregistrement…" : "Enregistrer les modifications"}
        </button>
      </div>
    </form>
  );
}
