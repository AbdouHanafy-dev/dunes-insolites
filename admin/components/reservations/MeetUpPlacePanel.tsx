"use client";

import { useFormIssues } from "@/components/useFormIssues";
import { useState } from "react";
import { useToast } from "@/components/Toast";
import { labelClass } from "@/components/payload/fields";

const MEETUP_FIELDS = [{ key: "meetUpPlace", label: "Point de rencontre", type: "text" }];

/**
 * Free-text "Meet up place" the support team fills in once a reservation has
 * a departure city, so they can organise the pickup later. Saved on its own
 * endpoint (not the guest-facing edit form), and allowed at any status.
 */
export default function MeetUpPlacePanel({
  reservationId,
  departureCityLabel,
  initialValue,
}: {
  reservationId: string;
  departureCityLabel: string | null;
  initialValue: string | null;
}) {
  const toast = useToast();
  const fi = useFormIssues(MEETUP_FIELDS);
  const [saved, setSaved] = useState(initialValue ?? "");
  const [value, setValue] = useState(initialValue ?? "");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    fi.clear();
    setBusy(true);
    const res = await fetch(`/api/proxy/reservations/${reservationId}/meet-up-place`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meetUpPlace: value }),
    });
    setBusy(false);
    if (res.status === 403) {
      toast.error("Votre rôle ne permet pas de modifier le lieu de rendez-vous.");
      return;
    }
    if (!res.ok) {
      toast.error(await fi.fromResponse(res, "Enregistrement du lieu de rendez-vous refusé"));
      return;
    }
    const updated = await res.json();
    const next = updated.meetUpPlace ?? "";
    setSaved(next);
    setValue(next);
    toast.success("Lieu de rendez-vous enregistré");
  }

  return (
    <form onSubmit={save} className="card rounded-2xl p-5">
      <h3 className="text-[13px] font-bold uppercase tracking-wide text-navy-700/50">Lieu de rendez-vous</h3>
      <p className="mt-1 text-[12px] text-navy-700/45">
        Point de rencontre{departureCityLabel ? ` à ${departureCityLabel}` : ""}, renseigné par l’équipe support ou pré-rempli par le client (option transport) — modifiable à tout moment.
        Visible uniquement dans le backoffice : le client est contacté par téléphone.
      </p>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1">
          <label className={labelClass} htmlFor="meetUpPlace">
            Point de rencontre
          </label>
          <input
            id="meetUpPlace"
            className={fi.inputClass("meetUpPlace")}
            maxLength={255}
            placeholder="Ex. Devant l’hôtel, gare routière, aéroport…"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          {fi.errs("meetUpPlace")}
        </div>
        <button type="submit" className="btn btn-primary" disabled={busy || value.trim() === saved}>
          {busy ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
      <div className="mt-3">{fi.panel()}</div>
    </form>
  );
}
