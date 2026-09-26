"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { labelClass } from "@/components/payload/fields";
import { sym } from "@/lib/currency";
import type { AdminExtra, AdminReservation } from "@/lib/api";
import { bookedOptions, defaultNights, partySize, selectableUpgrades, upgradeBlockedReason } from "@/lib/circuitOptions";

/**
 * A booked circuit's free return city and paid upgrades, editable by the team. The server prices
 * every line from the catalogue (per person per night for upgrades, once for the other return
 * city), so the amount shown after saving is the real one.
 */
export default function CircuitOptionsPanel({
  reservation,
  catalogue,
}: {
  reservation: AdminReservation;
  catalogue: AdminExtra[];
}) {
  const toast = useToast();
  const router = useRouter();
  const party = partySize(reservation);
  const stayNights = reservation.tourTypes[0]?.numberOfNights ?? null;
  const upgrades = selectableUpgrades(catalogue);
  const booked = bookedOptions(reservation);
  const bookedFor = (id: string) => booked.find((line) => line.selectedExtraId === id);

  const [returnCity, setReturnCity] = useState(reservation.returnCityOther ?? "");
  const [chosen, setChosen] = useState<Record<string, number>>(() =>
    Object.fromEntries(upgrades.flatMap((u) => {
      const line = bookedFor(u.extraId);
      return line ? [[u.extraId, defaultNights(line, party, stayNights)]] : [];
    })),
  );
  const [busy, setBusy] = useState(false);

  function toggle(u: AdminExtra, on: boolean) {
    setChosen((cur) => {
      const next = { ...cur };
      if (on) next[u.extraId] = defaultNights(bookedFor(u.extraId), party, stayNights);
      else delete next[u.extraId];
      return next;
    });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch(`/api/proxy/reservations/${reservation.reservationId}/circuit-options`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        returnCityOther: returnCity.trim() || null,
        options: Object.entries(chosen).map(([extraId, nights]) => ({ extraId, nights })),
      }),
    });
    setBusy(false);
    if (res.status === 403) {
      toast.error("Votre rôle ne permet pas de modifier ces options.");
      return;
    }
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.message ?? "Enregistrement des options refusé");
      return;
    }
    toast.success("Options enregistrées, montant recalculé");
    router.refresh();
  }

  const unit = sym(reservation.currency);

  return (
    <form onSubmit={save} className="card rounded-2xl p-5">
      <h3 className="text-[13px] font-bold uppercase tracking-wide text-navy-700/50">Ville de retour &amp; améliorations</h3>
      <p className="mt-1 text-[12px] text-navy-700/45">
        Le montant est recalculé par le serveur à l’enregistrement (tarifs du catalogue, {party} voyageur{party > 1 ? "s" : ""}).
      </p>

      <div className="mt-3 flex flex-col gap-1">
        <label className={labelClass} htmlFor="returnCityOther">Ville de retour hors liste</label>
        <input
          id="returnCityOther"
          className="input"
          maxLength={120}
          placeholder="Vide = retour dans la ville choisie dans la liste"
          value={returnCity}
          onChange={(e) => setReturnCity(e.target.value)}
        />
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {upgrades.length === 0 && <p className="text-[12px] text-navy-700/45">Aucune amélioration active dans le catalogue.</p>}
        {upgrades.map((u) => {
          const blocked = upgradeBlockedReason(u, party);
          const on = u.extraId in chosen;
          const line = bookedFor(u.extraId);
          return (
            <div key={u.extraId} className={`flex flex-wrap items-center gap-3 rounded-xl border border-navy-700/10 p-3 ${blocked && !on ? "opacity-50" : ""}`}>
              <label className="flex flex-1 items-center gap-2 text-sm font-medium text-navy-800">
                <input type="checkbox" checked={on} disabled={busy || (!!blocked && !on)} onChange={(e) => toggle(u, e.target.checked)} />
                {u.name}
                <span className="text-[12px] font-normal text-navy-700/50">{u.unitPrice} {unit}{u.pricingUnit === "PER_PERSON_NIGHT" ? " / pers. / nuit" : ""}</span>
              </label>
              {blocked && !on && <span className="text-[12px] text-navy-700/50">{blocked}</span>}
              {on && u.pricingUnit === "PER_PERSON_NIGHT" && (
                <label className="flex items-center gap-1 text-[12px] text-navy-700/60">
                  Nuits
                  <input
                    type="number" min={1} max={60} className="input w-20"
                    value={chosen[u.extraId]}
                    onChange={(e) => setChosen((cur) => ({ ...cur, [u.extraId]: Math.max(1, Number(e.target.value) || 1) }))}
                  />
                </label>
              )}
              {line && <span className="text-[12px] text-navy-700/50">actuel : {line.totalPrice} {unit}</span>}
            </div>
          );
        })}
      </div>

      {booked.some((line) => line.serviceType === "RETURN_CITY") && (
        <p className="mt-3 text-[12px] text-navy-700/55">
          Supplément ville de retour : {booked.find((line) => line.serviceType === "RETURN_CITY")?.totalPrice} {unit}
        </p>
      )}

      <div className="mt-4">
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer"}</button>
      </div>
    </form>
  );
}
