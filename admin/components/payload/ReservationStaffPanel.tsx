"use client";

import { readApiError } from "@/lib/apiError";
import { useState } from "react";
import { useToast } from "@/components/Toast";
import { inputClass, labelClass } from "@/components/payload/fields";
import type {
  AdminDriverProfile,
  AdminGuideProfile,
  AdminReservationStaffMember,
  AdminSpokenLanguage,
} from "@/lib/api";

/**
 * Guides and chauffeurs are selected from permanent directories. The backend
 * copies a snapshot into each reservation assignment so later profile edits
 * never rewrite history.
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
  arrivalMode,
  preferredLanguages,
  initialGuides,
  guideProfiles,
  initialChauffeurs,
  driverProfiles,
}: {
  reservationId: string;
  reservationType: string;
  status: string;
  arrivalMode: "OWN_VEHICLE" | "TRANSPORT" | null;
  preferredLanguages: AdminSpokenLanguage[];
  initialGuides: AdminReservationStaffMember[];
  guideProfiles: AdminGuideProfile[];
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

  /** Returns null on success, or the exact reason the assignment was refused. */
  async function addStaff(kind: "guides" | "chauffeurs", entry: Record<string, unknown>): Promise<string | null> {
    setBusy(true);
    const res = await fetch(`/api/proxy/reservations/${reservationId}/staff`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [kind]: [entry] }),
    });
    setBusy(false);
    if (!res.ok) {
      const message = await readApiError(res, "Affectation refusée par le serveur");
      toast.error(message);
      return message;
    }
    const updated = await res.json();
    setGuides(updated.guides ?? []);
    setChauffeurs(updated.chauffeurs ?? []);
    toast.success(kind === "guides" ? "Guide affecté" : "Chauffeur affecté");
    return null;
  }

  async function removeStaff(kind: "guides" | "chauffeurs", id: string) {
    setBusy(true);
    const res = await fetch(`/api/proxy/reservations/${reservationId}/staff/${kind}/${id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      toast.error(await readApiError(res, "Suppression impossible"));
      return;
    }
    if (kind === "guides") setGuides((prev) => prev.filter((g) => g.guideId !== id));
    else setChauffeurs((prev) => prev.filter((c) => c.chauffeurId !== id));
    toast.success("Retiré de la réservation");
  }

  const unmanageableNotice = !manageable && (
    <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-800">
      {reservationType !== "TOURS"
        ? "Le personnel ne peut être affecté qu'aux réservations de type Circuit."
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
          guideProfiles={guideProfiles}
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

        {arrivalMode === "TRANSPORT" && chauffeurs.length === 0 && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[13px] font-medium text-amber-800">
            Transport demandé par le client — confirmez le tarif puis affectez un chauffeur disponible ci-dessous.
          </p>
        )}
        {arrivalMode === "OWN_VEHICLE" && (
          <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-[13px] text-emerald-800">
            Le client a indiqué qu’il viendra avec son propre véhicule. Aucun chauffeur n’est requis.
          </p>
        )}

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
  guideProfiles,
  onAdd,
  onRemove,
  disabled,
}: {
  items: AdminReservationStaffMember[];
  preferredLanguages: AdminSpokenLanguage[];
  guideProfiles: AdminGuideProfile[];
  onAdd: (entry: Record<string, unknown>) => Promise<string | null>;
  onRemove: (id: string) => Promise<void>;
  disabled: boolean;
}) {
  const [formError, setFormError] = useState("");
  const activeGuides = guideProfiles.filter((guide) => guide.active);
  const [guideProfileId, setGuideProfileId] = useState("");
  const preferredIds = new Set(preferredLanguages.map((l) => l.languageId));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!guideProfileId) {
      setFormError("Guide de l’annuaire : aucun guide sélectionné — choisissez-en un dans la liste.");
      return;
    }
    const failure = await onAdd({ guideProfileId });
    if (failure) {
      setFormError(failure);
      return;
    }
    setGuideProfileId("");
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
        <form onSubmit={submit} className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="flex min-w-[220px] flex-1 flex-col gap-1">
            <label className={labelClass}>Guide de l’annuaire</label>
            <select
              className={formError && !guideProfileId ? inputClass.replace("border-navy-700/15", "border-rose") : inputClass}
              value={guideProfileId}
              onChange={(event) => setGuideProfileId(event.target.value)}
            >
              <option value="">Sélectionner un guide</option>
              {activeGuides.map((guide) => {
                const languageNames = guide.languages.map((language) => language.name).join(", ");
                const speaksPreferred = guide.languages.some((language) => preferredIds.has(language.languageId));
                return (
                  <option key={guide.guideProfileId} value={guide.guideProfileId}>
                    {guide.firstName} {guide.lastName}
                    {languageNames ? ` — ${languageNames}` : " — aucune langue renseignée"}
                    {speaksPreferred ? " ✓" : ""}
                  </option>
                );
              })}
            </select>
          </div>
          <button type="submit" className="btn btn-primary" disabled={activeGuides.length === 0}>
            Affecter
          </button>
          {activeGuides.length === 0 && (
            <p className="text-xs text-amber-700">Créez d’abord un guide dans l’annuaire.</p>
          )}
          {formError && (
            <div role="alert" className="basis-full rounded-xl border border-rose/25 bg-rose/8 px-4 py-3 text-[13px] text-rose">
              {formError}
            </div>
          )}
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
  onAdd: (entry: Record<string, unknown>) => Promise<string | null>;
  onRemove: (id: string) => Promise<void>;
  disabled: boolean;
}) {
  const [formError, setFormError] = useState("");
  const activeDrivers = driverProfiles.filter((driver) => driver.active);
  const [driverProfileId, setDriverProfileId] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!driverProfileId) {
      setFormError("Chauffeur de l’annuaire : aucun chauffeur sélectionné — choisissez-en un dans la liste.");
      return;
    }
    const failure = await onAdd({ driverProfileId });
    if (failure) {
      setFormError(failure);
      return;
    }
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
        <form onSubmit={submit} className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="flex min-w-[220px] flex-1 flex-col gap-1">
            <label className={labelClass}>Chauffeur de l’annuaire</label>
            <select className={formError && !driverProfileId ? inputClass.replace("border-navy-700/15", "border-rose") : inputClass} value={driverProfileId} onChange={(event) => setDriverProfileId(event.target.value)}>
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
          {formError && (
            <div role="alert" className="basis-full rounded-xl border border-rose/25 bg-rose/8 px-4 py-3 text-[13px] text-rose">
              {formError}
            </div>
          )}
        </form>
      )}
    </div>
  );
}
