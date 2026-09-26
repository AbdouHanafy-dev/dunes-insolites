"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import { CITY_OPTIONS } from "@/lib/cities";
import { sym } from "@/lib/currency";
import type { AdminReservation, AdminReservationStaffMember, Page } from "@/lib/api";
import { paymentStatusOf, statusOf } from "@/components/reservations/reservationStatus";
import { activityLines, lineLabel, optionLines, serviceLines } from "@/lib/reservationLines";
import { accommodationSummary, guestBreakdown, guestCounts, nightsOf } from "@/lib/stayReservation";

const TYPE_LABEL: Record<string, string> = { HEBERGEMENT: "Hébergement", TOURS: "Circuit", EXTRAS: "Activités" };

const cityLabel = (city: string | null | undefined) => CITY_OPTIONS.find((c) => c.value === city)?.label ?? city ?? "";

/** Who needs a guide and a chauffeur: every circuit, and a stay only when the guest asked for transportation. */
export function needsStaff(r: Pick<AdminReservation, "reservationType" | "arrivalMode">): boolean {
  return r.reservationType === "TOURS" || (r.reservationType === "HEBERGEMENT" && r.arrivalMode === "TRANSPORT");
}

/**
 * Everything booked for one day of the calendar: each reservation with its guests, what they
 * chose, how they arrive and the guide and chauffeur assigned to it (or the reminder that none is).
 */
export default function DayDetailModal({
  date,
  dateLabel,
  blockNote,
  closed,
  onClose,
}: {
  date: string;
  dateLabel: string;
  closed: boolean;
  blockNote: string | null;
  onClose: () => void;
}) {
  const [state, setState] = useState<{ date: string; rows: AdminReservation[] | null; failed: boolean } | null>(null);

  useEffect(() => {
    let ignore = false;
    fetch(`/api/proxy/reservations/by-date?date=${date}&size=100`)
      .then((res) => (res.ok ? (res.json() as Promise<Page<AdminReservation>>) : Promise.reject(new Error("bad"))))
      .then((page) => !ignore && setState({ date, rows: page.content, failed: false }))
      .catch(() => !ignore && setState({ date, rows: null, failed: true }));
    return () => {
      ignore = true;
    };
  }, [date]);

  const loaded = state && state.date === date ? state : null;
  const rows = loaded?.rows ?? [];
  const active = rows.filter((r) => !["CANCELLED", "REJECTED", "EXPIRED"].includes(r.status));
  const people = active.reduce((sum, r) => sum + guestCounts(r).coming, 0);
  const infants = active.reduce((sum, r) => sum + guestCounts(r).infants, 0);
  const toAssign = active.filter((r) => needsStaff(r) && (r.guides?.length ?? 0) === 0 && (r.chauffeurs?.length ?? 0) === 0).length;

  return (
    <Modal title={dateLabel} onClose={onClose} wide>
      {closed && (
        <p className="mb-3 rounded-lg bg-rose/10 px-3 py-2 text-[13px] font-medium text-rose">
          Date fermée{blockNote ? ` · ${blockNote}` : ""}
        </p>
      )}

      {!loaded ? (
        <p className="py-10 text-center text-sm text-navy-700/50">Chargement…</p>
      ) : loaded.failed ? (
        <p className="py-10 text-center text-sm text-rose">Impossible de charger les réservations de ce jour.</p>
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-navy-700/50">Aucune réservation ce jour-là.</p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2 text-[13px]">
            <Pill>{active.length} réservation{active.length > 1 ? "s" : ""}</Pill>
            <Pill>{people} voyageur{people > 1 ? "s" : ""}{infants > 0 ? ` + ${infants} bébé${infants > 1 ? "s" : ""}` : ""}</Pill>
            {rows.length > active.length && <Pill muted>{rows.length - active.length} annulée(s) ou refusée(s)</Pill>}
            {toAssign > 0 && <Pill warn>{toAssign} sans guide ni chauffeur</Pill>}
          </div>

          <div className="flex flex-col gap-3">
            {rows.map((r) => (
              <DayReservation key={r.reservationId} r={r} />
            ))}
          </div>
        </>
      )}

      <div className="mt-5 flex justify-end">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Fermer
        </button>
      </div>
    </Modal>
  );
}

function DayReservation({ r }: { r: AdminReservation }) {
  const st = statusOf(r.status);
  const pay = paymentStatusOf(r.paymentSummary?.paymentStatus);
  const currency = sym(r.currency);
  const line = [...r.tourTypes, ...r.tours][0];
  const nights = nightsOf(r);
  const activities = activityLines(r);
  const options = optionLines(r);
  const services = serviceLines(r);
  const guides = r.guides ?? [];
  const chauffeurs = r.chauffeurs ?? [];
  const returnCity = r.returnCityOther ? `${r.returnCityOther} (hors liste)` : cityLabel(r.returnCity);
  const cancelled = ["CANCELLED", "REJECTED", "EXPIRED"].includes(r.status);
  const staffNeeded = needsStaff(r);

  return (
    <article className={`rounded-xl border border-navy-700/12 p-4 ${cancelled ? "opacity-60" : ""}`}>
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-[15px] font-bold text-navy-800">{r.userName}</h3>
          <p className="text-[12px] text-navy-700/55">
            {TYPE_LABEL[r.reservationType] ?? r.reservationType} · {line?.name ?? "—"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-medium ${st.className}`}>{st.label}</span>
          <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-medium ${pay.className}`}>{pay.label}</span>
        </div>
      </header>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px] sm:grid-cols-3">
        <Fact label="Voyageurs" value={`${guestCounts(r).coming}${guestBreakdown(r) ? ` — ${guestBreakdown(r)}` : ""}`} />
        {accommodationSummary(r) && <Fact label="Hébergement" value={accommodationSummary(r)} />}
        {nights != null && <Fact label="Nuits" value={String(nights)} />}
        {r.checkOutDate && <Fact label="Départ" value={r.checkOutDate} />}
        {r.arrivalMode && (
          <Fact label="Arrivée en" value={r.arrivalMode === "TRANSPORT" ? "Transport demandé" : "Véhicule perso"} />
        )}
        {r.departureCity && <Fact label="Ville de départ" value={cityLabel(r.departureCity)} />}
        {returnCity && <Fact label="Ville de retour" value={returnCity} />}
        {r.meetUpPlace && <Fact label="Rendez-vous" value={r.meetUpPlace} />}
        {r.groupName && <Fact label="Groupe" value={r.groupName} />}
        <Fact label="Montant" value={`${r.totalAmount} ${currency}`} />
      </dl>

      {(activities.length > 0 || options.length > 0 || services.length > 0) && (
        <div className="mt-3 grid gap-2 text-[13px] sm:grid-cols-2">
          <Chips title="Activités" items={activities.map(lineLabel)} />
          <Chips title="Améliorations" items={options.map(lineLabel)} />
          <Chips title="Autres services" items={services.map(lineLabel)} />
        </div>
      )}

      {r.demandeSpecial && (
        <p className="mt-3 rounded-lg bg-navy-700/[0.04] px-3 py-2 text-[13px] text-navy-800">
          <span className="font-semibold">Remarques : </span>
          {r.demandeSpecial}
        </p>
      )}

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Staff
          title="Guide"
          people={guides}
          applicable={staffNeeded}
          empty={staffNeeded ? "Aucun guide affecté" : "Non concerné (véhicule perso)"}
          detail={(g) => (g.languages?.length ? g.languages.map((l) => l.name).join(", ") : null)}
        />
        <Staff
          title="Chauffeur"
          people={chauffeurs}
          applicable={staffNeeded}
          empty={staffNeeded ? "Aucun chauffeur affecté" : "Non concerné (véhicule perso)"}
          detail={(c) => [c.vehicleModel, c.numberOfSeats ? `${c.numberOfSeats} places` : null].filter(Boolean).join(" · ") || null}
        />
      </div>

      <footer className="mt-3 flex justify-end">
        <Link href={`/reservations/${r.reservationId}`} className="text-[13px] font-semibold text-navy-800 underline-offset-2 hover:underline">
          Ouvrir la fiche →
        </Link>
      </footer>
    </article>
  );
}

function Staff({
  title,
  people,
  applicable,
  empty,
  detail,
}: {
  title: string;
  people: AdminReservationStaffMember[];
  applicable: boolean;
  empty: string;
  detail: (p: AdminReservationStaffMember) => string | null;
}) {
  if (people.length === 0) {
    return (
      <div className={`rounded-lg px-3 py-2 text-[13px] ${applicable ? "bg-amber-50 text-amber-800" : "bg-gray-50 text-gray-500"}`}>
        <div className="text-[11px] font-semibold uppercase tracking-wide opacity-70">{title}</div>
        {empty}
      </div>
    );
  }
  return (
    <div className="rounded-lg bg-emerald-50 px-3 py-2 text-[13px] text-emerald-900">
      <div className="text-[11px] font-semibold uppercase tracking-wide opacity-70">{title}</div>
      {people.map((p) => (
        <div key={p.guideId ?? p.chauffeurId ?? `${p.firstName}${p.lastName}`}>
          <span className="font-medium">{p.firstName} {p.lastName}</span>
          {p.phoneNumber && <span className="text-emerald-900/70"> · {p.phoneNumber}</span>}
          {detail(p) && <div className="text-[12px] text-emerald-900/70">{detail(p)}</div>}
        </div>
      ))}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-navy-700/45">{label}</dt>
      <dd className="font-medium text-navy-800">{value}</dd>
    </div>
  );
}

function Chips({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-navy-700/45">{title}</div>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {items.map((label, i) => (
          <span key={`${label}-${i}`} className="rounded-full bg-gold/15 px-2.5 py-0.5 text-[12px] font-medium text-navy-800">
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function Pill({ children, warn, muted }: { children: React.ReactNode; warn?: boolean; muted?: boolean }) {
  return (
    <span
      className={`rounded-full px-3 py-1 font-medium ${
        warn ? "bg-amber-100 text-amber-800" : muted ? "bg-gray-100 text-gray-500" : "bg-navy-700/[0.06] text-navy-800"
      }`}
    >
      {children}
    </span>
  );
}
