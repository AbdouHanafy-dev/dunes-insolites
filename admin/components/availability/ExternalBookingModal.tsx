"use client";

import { useMemo, useState } from "react";
import Modal from "@/components/Modal";
import { readApiError } from "@/lib/apiError";
import type { AccommodationInventory, ExternalAccommodationBooking } from "@/lib/api";

const SOURCES = [
  ["GETYOURGUIDE", "GetYourGuide"],
  ["BOOKING_COM", "Booking.com"],
  ["EXPEDIA", "Expedia"],
  ["PHONE", "Téléphone"],
  ["WALK_IN", "Sur place"],
  ["OTHER", "Autre"],
] as const;

const INPUT = "w-full rounded-[9px] border border-navy-700/15 bg-surface-alt px-3.5 py-2.5 text-[14px] text-navy-800 outline-none focus:border-gold/60";

function nextDay(date: string): string {
  const value = new Date(`${date}T00:00:00`);
  value.setDate(value.getDate() + 1);
  return value.toLocaleDateString("en-CA");
}

function sourceLabel(source: string): string {
  return SOURCES.find(([value]) => value === source)?.[1] ?? source;
}

export default function ExternalBookingModal({
  initialDate,
  accommodations,
  onClose,
  onChanged,
}: {
  initialDate: string;
  accommodations: AccommodationInventory[];
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const [accommodationTypeId, setAccommodationTypeId] = useState(accommodations[0]?.accommodationTypeId ?? "");
  const [checkIn, setCheckIn] = useState(initialDate);
  const [checkOut, setCheckOut] = useState(nextDay(initialDate));
  const [units, setUnits] = useState(1);
  const [source, setSource] = useState("GETYOURGUIDE");
  const [externalReference, setExternalReference] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const existing = useMemo(() => {
    const unique = new Map<string, ExternalAccommodationBooking>();
    accommodations.flatMap((item) => item.externalBookings).forEach((booking) => unique.set(booking.id, booking));
    return [...unique.values()];
  }, [accommodations]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const response = await fetch("/api/proxy/availability/external-bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accommodationTypeId,
        checkIn,
        checkOut,
        units,
        source,
        externalReference: externalReference || undefined,
        note: note || undefined,
      }),
    });
    setBusy(false);
    if (!response.ok) {
      setError(await readApiError(response, "Impossible d’ajouter cette réservation externe"));
      return;
    }
    await onChanged();
    onClose();
  }

  async function remove(id: string) {
    setBusy(true);
    setError("");
    const response = await fetch(`/api/proxy/availability/external-bookings/${id}`, { method: "DELETE" });
    setBusy(false);
    if (!response.ok) {
      setError(await readApiError(response, "Impossible de supprimer cette réservation externe"));
      return;
    }
    await onChanged();
    onClose();
  }

  return (
    <Modal title="Réservation externe" onClose={onClose} wide>
      {error && <p className="mb-4 rounded-lg border border-rose/25 bg-rose/8 px-3 py-2 text-[13px] text-rose">{error}</p>}

      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Hébergement">
          <select required value={accommodationTypeId} onChange={(e) => setAccommodationTypeId(e.target.value)} className={INPUT}>
            {accommodations.map((item) => (
              <option key={item.accommodationTypeId} value={item.accommodationTypeId}>
                {item.name} · {item.availableUnits ?? "?"}/{item.maxUnits ?? "?"} libres
              </option>
            ))}
          </select>
        </Field>
        <Field label="Nombre d’unités">
          <input required min={1} type="number" value={units} onChange={(e) => setUnits(Number(e.target.value))} className={INPUT} />
        </Field>
        <Field label="Arrivée">
          <input required type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className={INPUT} />
        </Field>
        <Field label="Départ">
          <input required min={nextDay(checkIn)} type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className={INPUT} />
        </Field>
        <Field label="Source">
          <select value={source} onChange={(e) => setSource(e.target.value)} className={INPUT}>
            {SOURCES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
        <Field label="Référence externe">
          <input maxLength={120} value={externalReference} onChange={(e) => setExternalReference(e.target.value)} placeholder="Numéro de dossier" className={INPUT} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Note">
            <textarea maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} className={`${INPUT} min-h-20`} />
          </Field>
        </div>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <button type="button" onClick={onClose} className="btn btn-secondary">Annuler</button>
          <button type="submit" disabled={busy || accommodations.length === 0} className="btn btn-primary">
            {busy ? "…" : "Déduire du stock"}
          </button>
        </div>
      </form>

      {existing.length > 0 && (
        <div className="mt-6 border-t border-navy-700/10 pt-5">
          <h3 className="text-sm font-bold text-navy-800">Saisies externes actives ce jour</h3>
          <div className="mt-3 space-y-2">
            {existing.map((booking) => (
              <div key={booking.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-navy-700/[0.04] px-3 py-2.5 text-[13px]">
                <div>
                  <p className="font-semibold text-navy-800">{booking.accommodationName} · {booking.units} unité{booking.units > 1 ? "s" : ""}</p>
                  <p className="text-navy-700/55">{sourceLabel(booking.source)} · {booking.checkIn} → {booking.checkOut}{booking.externalReference ? ` · ${booking.externalReference}` : ""}</p>
                </div>
                <button type="button" disabled={busy} onClick={() => remove(booking.id)} className="btn btn-danger-outline">Supprimer</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="text-[13px] font-medium text-navy-700/70">{label}<div className="mt-1.5">{children}</div></label>;
}
