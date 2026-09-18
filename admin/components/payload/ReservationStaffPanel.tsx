"use client";

import { useState } from "react";
import { useToast } from "@/components/Toast";
import { inputClass, labelClass } from "@/components/payload/fields";
import type { AdminReservationStaffMember } from "@/lib/api";

/**
 * Guide/chauffeur are ad-hoc staff records tied 1:1 to a reservation (see
 * Guide.java / Chauffeur.java - a `reservation` FK is required at creation),
 * not a roster to pick from. So this is a small "type a name, attach it"
 * form on each side, not a dropdown - matching what the backend actually
 * models. Backend enforces reservationType === TOURS and a non-terminal
 * status; this panel mirrors that instead of letting a doomed request round-trip.
 */
export default function ReservationStaffPanel({
  reservationId,
  reservationType,
  status,
  initialGuides,
  initialChauffeurs,
}: {
  reservationId: string;
  reservationType: string;
  status: string;
  initialGuides: AdminReservationStaffMember[];
  initialChauffeurs: AdminReservationStaffMember[];
}) {
  const toast = useToast();
  const [guides, setGuides] = useState(initialGuides);
  const [chauffeurs, setChauffeurs] = useState(initialChauffeurs);
  const [busy, setBusy] = useState(false);

  const manageable =
    reservationType === "TOURS" &&
    !["CANCELLED", "REJECTED", "COMPLETED"].includes(status);

  async function addStaff(
    kind: "guides" | "chauffeurs",
    firstName: string,
    lastName: string,
    phoneNumber: string,
    driverUserEmail?: string,
  ) {
    setBusy(true);
    const entry: Record<string, unknown> = { firstName, lastName, phoneNumber: phoneNumber || null };
    if (kind === "chauffeurs" && driverUserEmail) entry.driverUserEmail = driverUserEmail;
    const res = await fetch(`/api/proxy/reservations/${reservationId}/staff`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [kind]: [entry] }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.message ?? "Impossible d'affecter ce membre du personnel.");
      return;
    }
    const updated = await res.json();
    setGuides(updated.guides ?? []);
    setChauffeurs(updated.chauffeurs ?? []);
    toast.success(kind === "guides" ? "Guide affecté" : "Chauffeur affecté");
  }

  async function removeStaff(kind: "guides" | "chauffeurs", id: string) {
    setBusy(true);
    const res = await fetch(`/api/proxy/reservations/${reservationId}/staff/${kind}/${id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      toast.error("Suppression impossible.");
      return;
    }
    if (kind === "guides") setGuides((prev) => prev.filter((g) => g.guideId !== id));
    else setChauffeurs((prev) => prev.filter((c) => c.chauffeurId !== id));
    toast.success("Retiré de la réservation");
  }

  return (
    <div className="card rounded-2xl p-5">
      <h3 className="text-[13px] font-bold uppercase tracking-wide text-navy-700/50">Équipe affectée</h3>
      <p className="mt-1 text-[12px] text-navy-700/45">
        Guide(s) et chauffeur(s) affectés à cette réservation. Le client les voit dans son espace personnel.
      </p>

      {!manageable && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-800">
          {reservationType !== "TOURS"
            ? "Le personnel ne peut être affecté qu'aux réservations de type Tours."
            : `Le personnel ne peut plus être modifié pour une réservation ${status.toLowerCase()}.`}
        </p>
      )}

      <StaffList kind="guides" label="Guides" items={guides} onAdd={addStaff} onRemove={removeStaff} disabled={!manageable || busy} />
      <StaffList kind="chauffeurs" label="Chauffeurs" items={chauffeurs} onAdd={addStaff} onRemove={removeStaff} disabled={!manageable || busy} />
    </div>
  );
}

function StaffList({
  kind,
  label,
  items,
  onAdd,
  onRemove,
  disabled,
}: {
  kind: "guides" | "chauffeurs";
  label: string;
  items: AdminReservationStaffMember[];
  onAdd: (
    kind: "guides" | "chauffeurs",
    firstName: string,
    lastName: string,
    phoneNumber: string,
    driverUserEmail?: string,
  ) => Promise<void>;
  onRemove: (kind: "guides" | "chauffeurs", id: string) => Promise<void>;
  disabled: boolean;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [driverUserEmail, setDriverUserEmail] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await onAdd(kind, firstName, lastName, phoneNumber, kind === "chauffeurs" ? driverUserEmail : undefined);
    setFirstName("");
    setLastName("");
    setPhoneNumber("");
    setDriverUserEmail("");
  }

  return (
    <div className="mt-5">
      <h4 className="text-[12px] font-semibold uppercase tracking-wide text-navy-700/40">{label}</h4>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-gray-400">Aucun {label.toLowerCase().slice(0, -1)} affecté pour le moment.</p>
      ) : (
        <ul className="mt-2 divide-y divide-gray-100 rounded-xl border border-navy-700/10">
          {items.map((m) => {
            const id = (m.guideId ?? m.chauffeurId)!;
            return (
              <li key={id} className="flex items-center justify-between px-4 py-2 text-sm">
                <span className="font-medium text-gray-900">
                  {m.firstName} {m.lastName}
                  {m.phoneNumber && <span className="ml-2 font-normal text-gray-500">{m.phoneNumber}</span>}
                  {m.driverUserEmail && (
                    <span className="ml-2 rounded-full bg-emerald/10 px-2 py-0.5 text-[11px] font-medium text-emerald">
                      compte lié : {m.driverUserEmail}
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  disabled={disabled}
                  className="text-rose hover:underline disabled:opacity-40"
                  onClick={() => onRemove(kind, id)}
                >
                  Retirer
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {!disabled && (
        <form onSubmit={submit} className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Prénom</label>
            <input required className={inputClass} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Nom</label>
            <input required className={inputClass} value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Téléphone</label>
            <input className={inputClass} value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
          </div>
          {kind === "chauffeurs" ? (
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Compte chauffeur (optionnel)</label>
              <input
                type="email"
                placeholder="email du compte"
                className={inputClass}
                value={driverUserEmail}
                onChange={(e) => setDriverUserEmail(e.target.value)}
              />
            </div>
          ) : (
            <div />
          )}
          <div className="flex items-end sm:col-span-4">
            <button type="submit" className="btn btn-primary">
              Affecter
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
