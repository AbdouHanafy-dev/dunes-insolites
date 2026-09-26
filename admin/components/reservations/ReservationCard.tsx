"use client";

import Link from "next/link";
import FlipCard, { FlipHint } from "@/components/FlipCard";
import { CITY_OPTIONS } from "@/lib/cities";
import { sym } from "@/lib/currency";
import type { AdminReservation } from "@/lib/api";
import { activityLines, lineLabel, optionLines, serviceLines } from "@/lib/reservationLines";
import { accommodationSummary, guestBreakdown, guestCounts, nightsOf } from "@/lib/stayReservation";
import { isEditable, paymentStatusOf, statusOf } from "./reservationStatus";
import { StaffPair } from "./StaffPair";

const TYPE_LABEL: Record<string, string> = { HEBERGEMENT: "Hébergement", TOURS: "Circuit", EXTRAS: "Activités" };

const cityLabel = (city: string | null | undefined) => CITY_OPTIONS.find((c) => c.value === city)?.label ?? city ?? "";
const prestation = (r: AdminReservation) => [...r.tourTypes, ...r.tours][0]?.name ?? r.reservationType;
const arrivalLabel = (mode: AdminReservation["arrivalMode"]) =>
  mode === "TRANSPORT" ? "Transport demandé" : mode === "OWN_VEHICLE" ? "Véhicule perso" : "";

const iconBtn =
  "flex h-8 w-8 items-center justify-center rounded-md text-[15px] text-navy-700/60 transition hover:bg-navy-700/8 hover:text-navy-800";

/**
 * A reservation as a two-sided card. The front says who it is and carries the actions, including
 * the one-click confirmation; the back holds what does not fit there.
 */
export default function ReservationCard({
  reservation: r,
  canDelete,
  confirming,
  onConfirm,
  onDelete,
}: {
  reservation: AdminReservation;
  canDelete: boolean;
  confirming: boolean;
  onConfirm: (r: AdminReservation) => void;
  onDelete: (r: AdminReservation) => void;
}) {
  const st = statusOf(r.status);
  const pay = paymentStatusOf(r.paymentSummary?.paymentStatus);
  const currency = sym(r.currency);
  const coming = guestCounts(r).coming;
  const arrival = r.checkInDate ?? r.serviceDate;

  const front = (
    <div className="flex h-full flex-col gap-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-[16px] font-bold text-navy-800">{r.userName}</h3>
          <p className="truncate text-[12px] text-navy-700/55">
            {TYPE_LABEL[r.reservationType] ?? r.reservationType} · {prestation(r)}
          </p>
        </div>
        <p className="whitespace-nowrap text-[16px] font-bold tabular-nums text-navy-800">
          {r.totalAmount} {currency}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-medium ${st.className}`}>{st.label}</span>
        <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-medium ${pay.className}`}>{pay.label}</span>
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-[13px]">
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-navy-700/45">Arrivée</dt>
          <dd className="font-medium tabular-nums text-navy-800">{arrival ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-navy-700/45">Voyageurs</dt>
          <dd className="font-medium text-navy-800">
            {coming}
            <span className="ml-1 text-[12px] font-normal text-navy-700/55">{guestBreakdown(r)}</span>
          </dd>
        </div>
      </dl>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-navy-700/8 pt-3">
        {r.status === "PENDING" ? (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-emerald-600 px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            title="Confirmer la réservation (paiement sur place, sans lien de paiement)"
            disabled={confirming}
            onClick={() => onConfirm(r)}
          >
            <i className="bi bi-check2-circle" aria-hidden />
            {confirming ? "Confirmation…" : "Confirmer"}
          </button>
        ) : (
          <FlipHint />
        )}
        <div className="flex items-center gap-0.5">
          {isEditable(r.status) ? (
            <Link href={`/reservations/${r.reservationId}#gestion`} className={iconBtn} title="Modifier" aria-label="Modifier">
              <i className="bi bi-pencil" aria-hidden />
            </Link>
          ) : (
            <span className={`${iconBtn} cursor-not-allowed opacity-30`} title={`Non modifiable — ${st.label.toLowerCase()}`}>
              <i className="bi bi-pencil" aria-hidden />
            </span>
          )}
          {canDelete && (
            <button
              type="button"
              className={`${iconBtn} hover:!bg-rose/10 hover:!text-rose`}
              title="Supprimer"
              aria-label="Supprimer"
              onClick={() => onDelete(r)}
            >
              <i className="bi bi-trash3" aria-hidden />
            </button>
          )}
        </div>
      </div>
      {r.status === "PENDING" && <FlipHint />}
    </div>
  );

  return (
    <FlipCard
      label={`Réservation de ${r.userName}`}
      front={front}
      back={<ReservationBack r={r} />}
    />
  );
}

/** The other side: everything the front does not show. */
function ReservationBack({ r }: { r: AdminReservation }) {
  const currency = sym(r.currency);
  const nights = nightsOf(r);
  const activities = activityLines(r);
  const options = optionLines(r);
  const services = serviceLines(r);
  const returnCity = r.returnCityOther ? `${r.returnCityOther} (hors liste)` : cityLabel(r.returnCity);
  const languages = [...(r.preferredLanguages ?? []).map((l) => l.name), r.otherLanguageRequested].filter(Boolean).join(", ");
  const summary = r.paymentSummary;

  return (
    <div className="flex h-full flex-col gap-3 text-[13px]">
      <div className="flex items-center justify-between gap-2">
        <h3 className="truncate text-[14px] font-bold text-navy-800">{r.userName}</h3>
        <FlipHint back />
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
        {r.checkOutDate && <Fact label="Départ" value={r.checkOutDate} />}
        {nights != null && <Fact label="Nuits" value={String(nights)} />}
        {accommodationSummary(r) && <Fact label="Hébergement" value={accommodationSummary(r)} />}
        {arrivalLabel(r.arrivalMode) && <Fact label="Arrivée en" value={arrivalLabel(r.arrivalMode)} />}
        {r.departureCity && <Fact label="Ville de départ" value={cityLabel(r.departureCity)} />}
        {returnCity && <Fact label="Ville de retour" value={returnCity} />}
        {r.meetUpPlace && <Fact label="Rendez-vous" value={r.meetUpPlace} />}
        {languages && <Fact label="Langue(s)" value={languages} />}
        {r.groupName && <Fact label="Groupe" value={r.groupName} />}
        {r.promoCode && <Fact label="Code promo" value={`${r.promoCode}${r.promoDiscountPercent ? ` (-${r.promoDiscountPercent} %)` : ""}`} />}
        {summary && (
          <Fact label="Paiement" value={`Payé ${summary.totalPaid} ${currency} · reste ${summary.remainingTotal} ${currency}`} />
        )}
      </dl>

      <Lines title="Activités" items={activities.map((l) => `${lineLabel(l)} — ${l.totalPrice ?? "—"} ${currency}`)} />
      <Lines title="Améliorations" items={options.map((l) => `${lineLabel(l)} — ${l.totalPrice ?? "—"} ${currency}`)} />
      <Lines title="Autres services" items={services.map((l) => `${lineLabel(l)} — ${l.totalPrice ?? "—"} ${currency}`)} />

      <StaffPair r={r} />

      {r.demandeSpecial && (
        <p className="rounded-lg bg-navy-700/[0.04] px-3 py-2 text-navy-800">
          <span className="font-semibold">Remarques : </span>
          {r.demandeSpecial}
        </p>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-navy-700/8 pt-3">
        <span className="text-[12px] text-navy-700/45">Créée le {new Date(r.createdAt).toLocaleDateString("fr-FR")}</span>
        <Link href={`/reservations/${r.reservationId}`} className="text-[13px] font-semibold text-navy-800 underline-offset-2 hover:underline">
          Ouvrir la fiche →
        </Link>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="col-span-1">
      <dt className="text-[11px] uppercase tracking-wide text-navy-700/45">{label}</dt>
      <dd className="font-medium text-navy-800">{value}</dd>
    </div>
  );
}

function Lines({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-navy-700/45">{title}</div>
      <ul className="mt-1 flex flex-col gap-0.5">
        {items.map((text, i) => (
          <li key={`${text}-${i}`} className="text-navy-800">
            {text}
          </li>
        ))}
      </ul>
    </div>
  );
}
