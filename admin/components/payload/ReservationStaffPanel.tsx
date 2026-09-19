"use client";

import { useState } from "react";
import { useToast } from "@/components/Toast";
import { inputClass, labelClass } from "@/components/payload/fields";
import type { AdminDriverProfile, AdminReservationStaffMember, AdminSpokenLanguage } from "@/lib/api";

/**
 * Guides remain reservation-specific records. Chauffeurs are selected from
 * the permanent driver directory; the backend copies a snapshot into the
 * reservation assignment so later profile edits never rewrite history.
 *
 * Guide and chauffeur are deliberately separate roles here: a guide
 * translates (Guide.languages, matched against `preferredLanguage`) and
 * never drives; a chauffeur drives their own vehicle (vehicleModel /
 * numberOfSeats) and doesn't need to speak the client's language. A
 * reservation can get either, both, or neither.
 */
export default function ReservationStaffPanel({
  reservationId,
  reservationType,
  status,
  preferredLanguages,
  allLanguages,
  initialGuides,
  initialChauffeurs,
  driverProfiles,
}: {
  reservationId: string;
  reservationType: string;
  status: string;
  preferredLanguages: AdminSpokenLanguage[];
  allLanguages: AdminSpokenLanguage[];
  initialGuides: AdminReservationStaffMember[];
  initialChauffeurs: AdminReservationStaffMember[];
  driverProfiles: AdminDriverProfile[];
}) {
  const toast = useToast();
  const [guides, setGuides] = useState(initialGuides);
  const [chauffeurs, setChauffeurs] = useState(initialChauffeurs);
  const [busy, setBusy] = useState(false);

  const manageable =
    reservationType === "TOURS" &&
    !["CANCELLED", "REJECTED", "COMPLETED"].includes(status);

  async function addStaff(kind: "guides" | "chauffeurs", entry: Record<string, unknown>) {
    setBusy(true);
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

  const unmanageableNotice = !manageable && (
    <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-800">
      {reservationType !== "TOURS"
        ? "Le personnel ne peut être affecté qu'aux réservations de type Tours."
        : `Le personnel ne peut plus être modifié pour une réservation ${status.toLowerCase()}.`}
    </p>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="card rounded-2xl p-5">
        <h3 className="text-[13px] font-bold uppercase tracking-wide text-navy-700/50">Guides</h3>
        <p className="mt-1 text-[12px] text-navy-700/45">
          Le guide traduit pour le groupe — affecté séparément du chauffeur. Le client le voit dans son
          espace personnel.
        </p>

        {preferredLanguages.length > 0 && (
          <p className="mt-3 rounded-lg bg-sky-50 px-3 py-2 text-[13px] text-sky-800">
            Langue(s) préférée(s) du client :{" "}
            <strong>{preferredLanguages.map((l) => l.name).join(", ")}</strong> — choisissez un guide qui en
            parle une.
          </p>
        )}

        {unmanageableNotice}

        <GuideList
          items={guides}
          preferredLanguages={preferredLanguages}
          allLanguages={allLanguages}
          onAdd={(entry) => addStaff("guides", entry)}
          onRemove={(id) => removeStaff("guides", id)}
          disabled={!manageable || busy}
        />
      </div>

      <div className="card rounded-2xl p-5">
        <h3 className="text-[13px] font-bold uppercase tracking-wide text-navy-700/50">Chauffeurs</h3>
        <p className="mt-1 text-[12px] text-navy-700/45">
          Le chauffeur conduit son propre véhicule — affecté séparément du guide. Le client le voit dans son
          espace personnel.
        </p>

        {unmanageableNotice}

        <ChauffeurList
          items={chauffeurs}
          driverProfiles={driverProfiles}
          onAdd={(entry) => addStaff("chauffeurs", entry)}
          onRemove={(id) => removeStaff("chauffeurs", id)}
          disabled={!manageable || busy}
        />
      </div>
    </div>
  );
}

function GuideList({
  items,
  preferredLanguages,
  allLanguages,
  onAdd,
  onRemove,
  disabled,
}: {
  items: AdminReservationStaffMember[];
  preferredLanguages: AdminSpokenLanguage[];
  allLanguages: AdminSpokenLanguage[];
  onAdd: (entry: Record<string, unknown>) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  disabled: boolean;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [languageIds, setLanguageIds] = useState<string[]>([]);
  const preferredIds = new Set(preferredLanguages.map((l) => l.languageId));
  const selectableLanguages = allLanguages.filter((l) => l.active || preferredIds.has(l.languageId));

  function toggleLanguage(id: string) {
    setLanguageIds((cur) => (cur.includes(id) ? cur.filter((l) => l !== id) : [...cur, id]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await onAdd({ firstName, lastName, phoneNumber: phoneNumber || null, languageIds });
    setFirstName("");
    setLastName("");
    setPhoneNumber("");
    setLanguageIds([]);
  }

  return (
    <div className="mt-3">
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-gray-400">Aucun guide affecté pour le moment.</p>
      ) : (
        <ul className="mt-2 divide-y divide-gray-100 rounded-xl border border-navy-700/10">
          {items.map((m) => {
            const id = m.guideId!;
            const speaksPreferred = (m.languages ?? []).some((l) => preferredIds.has(l.languageId));
            return (
              <li key={id} className="flex items-center justify-between px-4 py-2 text-sm">
                <span className="font-medium text-gray-900">
                  {m.firstName} {m.lastName}
                  {m.phoneNumber && <span className="ml-2 font-normal text-gray-500">{m.phoneNumber}</span>}
                  {(m.languages ?? []).map((lang) => (
                    <span
                      key={lang.languageId}
                      className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        preferredIds.has(lang.languageId)
                          ? "bg-emerald/15 text-emerald"
                          : "bg-navy-700/5 text-navy-700/50"
                      }`}
                    >
                      {lang.name}
                    </span>
                  ))}
                  {speaksPreferred && <span className="ml-2 text-[11px] text-emerald">✓ parle la langue du client</span>}
                </span>
                <button
                  type="button"
                  disabled={disabled}
                  className="text-rose hover:underline disabled:opacity-40"
                  onClick={() => onRemove(id)}
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
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Langues parlées</label>
            {selectableLanguages.length === 0 ? (
              <p className="text-[12px] text-navy-700/45">
                Aucune langue configurée — gérez la liste sous Catalogue → Langues.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 pt-1">
                {selectableLanguages.map((lang) => (
                  <label key={lang.languageId} className="flex items-center gap-1 text-[12px] text-navy-700/70">
                    <input
                      type="checkbox"
                      checked={languageIds.includes(lang.languageId)}
                      onChange={() => toggleLanguage(lang.languageId)}
                    />
                    {lang.name}
                  </label>
                ))}
              </div>
            )}
          </div>
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

function ChauffeurList({
  items,
  driverProfiles,
  onAdd,
  onRemove,
  disabled,
}: {
  items: AdminReservationStaffMember[];
  driverProfiles: AdminDriverProfile[];
  onAdd: (entry: Record<string, unknown>) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  disabled: boolean;
}) {
  const activeDrivers = driverProfiles.filter((driver) => driver.active);
  const [driverProfileId, setDriverProfileId] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!driverProfileId) return;
    await onAdd({ driverProfileId });
    setDriverProfileId("");
  }

  return (
    <div className="mt-3">
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-gray-400">Aucun chauffeur affecté pour le moment.</p>
      ) : (
        <ul className="mt-2 divide-y divide-gray-100 rounded-xl border border-navy-700/10">
          {items.map((m) => {
            const id = m.chauffeurId!;
            return (
              <li key={id} className="flex items-center justify-between px-4 py-2 text-sm">
                <span className="font-medium text-gray-900">
                  {m.firstName} {m.lastName}
                  {m.phoneNumber && <span className="ml-2 font-normal text-gray-500">{m.phoneNumber}</span>}
                  {m.vehicleModel && (
                    <span className="ml-2 rounded-full bg-navy-700/5 px-2 py-0.5 text-[11px] font-medium text-navy-700/60">
                      {m.vehicleModel}
                      {m.numberOfSeats != null ? ` · ${m.numberOfSeats} places` : ""}
                    </span>
                  )}
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
                  onClick={() => onRemove(id)}
                >
                  Retirer
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {!disabled && (
        <form onSubmit={submit} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-1">
            <label className={labelClass}>Chauffeur de l’annuaire</label>
            <select required className={inputClass} value={driverProfileId} onChange={(event) => setDriverProfileId(event.target.value)}>
              <option value="">Sélectionner un chauffeur</option>
              {activeDrivers.map((driver) => (
                <option key={driver.driverProfileId} value={driver.driverProfileId}>
                  {driver.firstName} {driver.lastName} — {driver.vehicleModel ?? "véhicule non renseigné"}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary" disabled={activeDrivers.length === 0}>Affecter</button>
          {activeDrivers.length === 0 && (
            <p className="text-xs text-amber-700">Créez d’abord un chauffeur dans l’annuaire.</p>
          )}
        </form>
      )}
    </div>
  );
}
