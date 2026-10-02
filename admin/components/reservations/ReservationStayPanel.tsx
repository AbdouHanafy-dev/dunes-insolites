import type { ReactNode } from "react";
import type { AdminReservationDetail, AdminReservationExtra, AdminReservationLine } from "@/lib/api";
import { sym } from "@/lib/currency";
import { activityLines, lineLabel, optionLines, serviceLines } from "@/lib/reservationLines";
import { guestBreakdown, nightsOf } from "@/lib/stayReservation";

const longDate = (iso: string | null | undefined): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
};

const nightsLabel = (n: number) => `${n} nuit${n > 1 ? "s" : ""}`;

const PICKUP_LABELS: [keyof NonNullable<AdminReservationExtra["pickupDetails"]>, string][] = [
  ["hotelName", "Hôtel"],
  ["airport", "Aéroport"],
  ["flightNumber", "Vol"],
  ["address", "Adresse"],
  ["arrivalTime", "Heure"],
  ["instructions", "Consignes"],
];

/**
 * What was actually booked, read-only: the stay (nights, dates, accommodation tiers and who sleeps
 * where), circuits with their camp nights, and every activity, option and service with its length
 * and date. Amounts are what the server recorded; nothing is computed here.
 */
export default function ReservationStayPanel({ reservation: r }: { reservation: AdminReservationDetail }) {
  const currency = sym(r.currency);
  const nights = nightsOf(r);
  const activities = activityLines(r);
  const options = optionLines(r);
  const services = serviceLines(r);
  const hasContent = r.tourTypes.length > 0 || r.tours.length > 0 || activities.length + options.length + services.length > 0;

  if (!hasContent && !r.demandeSpecial) return null;

  return (
    <section className="card flex flex-col gap-5 rounded-2xl p-5">
      <h3 className="text-[13px] font-bold uppercase tracking-wide text-navy-700/50">Séjour &amp; prestations</h3>

      {r.tourTypes.map((line, i) => (
        <StayBlock key={line.catalogTourTypeId ?? i} line={line} r={r} nights={nights} currency={currency} />
      ))}

      {r.tours.map((line, i) => (
        <CircuitBlock key={line.catalogTourId ?? i} line={line} currency={currency} />
      ))}

      <ExtraGroup title="Activités" icon="bi-compass" lines={activities} currency={currency} showDuration />
      <ExtraGroup title="Améliorations et options" icon="bi-stars" lines={options} currency={currency} />
      <ExtraGroup title="Guide, transport et autres services" icon="bi-truck" lines={services} currency={currency} />

      {r.demandeSpecial && (
        <div>
          <div className="text-[11px] uppercase tracking-wide text-gray-400">Remarques du client</div>
          <p className="mt-1 whitespace-pre-line rounded-lg bg-navy-700/[0.04] px-3 py-2 text-sm text-navy-800">{r.demandeSpecial}</p>
        </div>
      )}
    </section>
  );
}

function StayBlock({
  line,
  r,
  nights,
  currency,
}: {
  line: AdminReservationLine;
  r: AdminReservationDetail;
  nights: number | null;
  currency: string;
}) {
  // The dates win over the line's count: older bookings stored every stay line as one night.
  const stayNights = nights ?? line.numberOfNights;
  const party = guestBreakdown(line.numberOfAdults != null ? line : r);
  const arrival = longDate(r.checkInDate ?? line.activityDate);
  const departure = longDate(r.checkOutDate);

  return (
    <div className="rounded-xl border border-navy-700/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-navy-800">
          <i className="bi bi-moon-stars text-base text-navy-700/60" aria-hidden />
          {line.name}
        </div>
        <span className="tabular-nums text-sm font-semibold text-navy-800">{line.totalPrice} {currency}</span>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        {stayNights != null && <Fact label="Durée" value={nightsLabel(stayNights)} />}
        {arrival && <Fact label="Arrivée" value={arrival} />}
        {departure && <Fact label="Départ" value={departure} />}
        {party && <Fact label="Voyageurs" value={party} />}
        {line.duration && <Fact label="Formule" value={line.duration} />}
      </dl>

      {line.accommodations && line.accommodations.length > 0 && (
        <div className="mt-4">
          <div className="text-[11px] uppercase tracking-wide text-gray-400">Hébergement</div>
          <ul className="mt-1 divide-y divide-navy-700/8 rounded-lg border border-navy-700/10">
            {line.accommodations.map((tier, i) => {
              const who = guestBreakdown({ numberOfAdults: tier.adults, numberOfChildren: tier.children, numberOfInfants: tier.infants });
              return (
                <li key={tier.accommodationName ?? i} className="flex flex-wrap items-center justify-between gap-x-3 px-3 py-2 text-sm">
                  <span className="font-medium text-navy-800">
                    {tier.accommodationName ?? "Hébergement"} × {Math.max(tier.accommodationUnits ?? 1, 1)}
                  </span>
                  {who && <span className="text-[12px] text-navy-700/60">{who}</span>}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function CircuitBlock({ line, currency }: { line: AdminReservationLine; currency: string }) {
  const departure = longDate(line.departureDate);
  const party = guestBreakdown(line);

  return (
    <div className="rounded-xl border border-navy-700/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-navy-800">
          <i className="bi bi-signpost-split text-base text-navy-700/60" aria-hidden />
          {line.name}
        </div>
        <span className="tabular-nums text-sm font-semibold text-navy-800">{line.totalPrice} {currency}</span>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        {line.duration && <Fact label="Durée" value={line.duration} />}
        {departure && <Fact label="Départ du circuit" value={departure} />}
        {party && <Fact label="Voyageurs" value={party} />}
      </dl>

      {line.hebergements && line.hebergements.length > 0 && (
        <div className="mt-4">
          <div className="text-[11px] uppercase tracking-wide text-gray-400">Nuits au campement</div>
          <ul className="mt-1 divide-y divide-navy-700/8 rounded-lg border border-navy-700/10">
            {line.hebergements.map((h, i) => (
              <li key={h.hebergementId ?? i} className="flex flex-wrap items-center justify-between gap-x-3 px-3 py-2 text-sm">
                <span className="font-medium text-navy-800">
                  {h.name}
                  {h.numberOfNights != null && h.numberOfNights > 0 && ` — ${nightsLabel(h.numberOfNights)}`}
                </span>
                {h.activityDate && <span className="text-[12px] text-navy-700/60">{longDate(h.activityDate)}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ExtraGroup({
  title,
  icon,
  lines,
  currency,
  showDuration,
}: {
  title: string;
  icon: string;
  lines: AdminReservationExtra[];
  currency: string;
  showDuration?: boolean;
}) {
  if (lines.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-gray-400">
        <i className={`bi ${icon}`} aria-hidden />
        {title}
      </div>
      <ul className="mt-1 divide-y divide-navy-700/8 rounded-lg border border-navy-700/10">
        {lines.map((line) => {
          const date = longDate(line.activityDate);
          const pickup = PICKUP_LABELS.flatMap(([key, label]) => {
            const value = line.pickupDetails?.[key];
            return value ? [`${label} : ${value}`] : [];
          });
          return (
            <li key={line.reservationExtraId} className="px-3 py-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-navy-800">{lineLabel(line)}</span>
                <span className="whitespace-nowrap tabular-nums text-navy-700/70">
                  {line.totalPrice != null ? `${line.totalPrice} ${currency}` : "—"}
                </span>
              </div>
              <div className="mt-0.5 flex flex-wrap gap-x-4 text-[12px] text-navy-700/60">
                {showDuration && line.duration && (
                  <Meta icon="bi-clock">{line.duration}</Meta>
                )}
                {date && <Meta icon="bi-calendar-event">{date}</Meta>}
                {line.unitPrice != null && (line.quantity ?? 1) > 1 && (
                  <Meta icon="bi-tag">{line.unitPrice} {currency} l&apos;unité</Meta>
                )}
              </div>
              {pickup.length > 0 && <p className="mt-0.5 text-[12px] text-navy-700/60">{pickup.join(" · ")}</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Meta({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1">
      <i className={`bi ${icon}`} aria-hidden />
      {children}
    </span>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-gray-900">{value}</dd>
    </div>
  );
}
