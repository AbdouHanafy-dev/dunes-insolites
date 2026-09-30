"use client";

import { readApiError } from "@/lib/apiError";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";
import type { AdminReservation } from "@/lib/api";
import { isEditable, paymentStatusOf, statusOf } from "./reservationStatus";
import { sym } from "@/lib/currency";
import { accommodationSummary, guestBreakdown, guestCounts, nightsOf } from "@/lib/stayReservation";
import { activityLines, activitySummary, lineLabel, optionLines, serviceLines } from "@/lib/reservationLines";
import { CITY_OPTIONS } from "@/lib/cities";
import TableFilters from "@/components/TableFilters";
import SortHeader from "@/components/SortHeader";
import ViewToggle, { type ListView } from "@/components/ViewToggle";
import ReservationCard from "./ReservationCard";
import {
  applyFilters, matchesSearch, optionsFrom,
  type FilterDef, type FilterState,
} from "@/lib/tableFilters";
import { PAYMENT_STATUS, RESERVATION_STATUS } from "./reservationStatus";

/** How the guest gets to the camp: it decides whether a guide and a chauffeur are assigned. */
const arrivalLabel = (mode: AdminReservation["arrivalMode"]) =>
  mode === "TRANSPORT" ? "Transport demandé" : mode === "OWN_VEHICLE" ? "Véhicule perso" : "—";

const prestation = (r: AdminReservation) => [...r.tourTypes, ...r.tours][0]?.name ?? r.reservationType;
const dateOf = (r: AdminReservation) => r.checkInDate ?? r.serviceDate ?? "";

type SortKey = "client" | "arrival" | "prestation" | "guests" | "accommodation" | "nights" | "activities" | "status" | "payment" | "date" | "created" | "amount";

const COLUMNS: { key: SortKey; label: string; right?: boolean }[] = [
  { key: "client", label: "Client" },
  { key: "prestation", label: "Prestation" },
  { key: "activities", label: "Activités" },
  { key: "status", label: "Statut / paiement" },
  { key: "date", label: "Date" },
  { key: "amount", label: "Montant", right: true },
];

/** The accommodation list: who is coming, which tier and how many, and for how many nights. */
const STAY_COLUMNS: { key: SortKey; label: string; right?: boolean }[] = [
  { key: "client", label: "Client" },
  { key: "guests", label: "Voyageurs" },
  { key: "accommodation", label: "Hébergement" },
  { key: "nights", label: "Nuits" },
  { key: "arrival", label: "Arrivée en" },
  { key: "activities", label: "Activités" },
  { key: "status", label: "Statut / paiement" },
  { key: "date", label: "Arrivée" },
  { key: "amount", label: "Montant", right: true },
];

function sortValue(r: AdminReservation, key: SortKey): string | number {
  switch (key) {
    case "guests":
      return guestCounts(r).coming;
    case "accommodation":
      return accommodationSummary(r).toLowerCase();
    case "nights":
      return nightsOf(r) ?? 0;
    case "activities":
      return activitySummary(r).toLowerCase();
    case "arrival":
      return arrivalLabel(r.arrivalMode);
    case "client":
      return r.userName.toLowerCase();
    case "prestation":
      return prestation(r).toLowerCase();
    case "status":
      return statusOf(r.status).label;
    case "payment":
      return paymentStatusOf(r.paymentSummary?.paymentStatus).label;
    case "date":
      return dateOf(r);
    case "created":
      return r.createdAt;
    case "amount":
      return r.totalAmount;
  }
}

export default function ReservationsTable({
  reservations,
  canDelete,
  title,
  pageSize = 5,
  limit,
  variant = "all",
  initialQuery = "",
}: {
  reservations: AdminReservation[];
  canDelete: boolean;
  /** Optional card heading, shown left of the search box. */
  title?: string;
  pageSize?: number;
  /** Show at most this many rows in total (after search + sort). */
  limit?: number;
  /** "stays" adds the travelers, the accommodation booked and the nights. */
  variant?: "all" | "stays";
  /** A search already typed, e.g. a promo code carried over from the promo codes page. */
  initialQuery?: string;
}) {
  const columns = variant === "stays" ? STAY_COLUMNS : COLUMNS;
  const router = useRouter();
  const toast = useToast();
  const [query, setQuery] = useState(initialQuery);
  const [filterState, setFilterState] = useState<FilterState>({});
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "created", dir: "desc" });
  const [viewing, setViewing] = useState<AdminReservation | null>(null);
  const [deleting, setDeleting] = useState<AdminReservation | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  // Cards by default; the compact dashboard table (a row limit) stays a list.
  const [view, setView] = useState<ListView>(limit ? "list" : "cards");
  const [page, setPage] = useState(0);

  const filterDefs = useMemo<FilterDef<AdminReservation>[]>(
    () => [
      {
        id: "status", label: "Statut", kind: "select",
        options: Object.entries(RESERVATION_STATUS).map(([value, s]) => ({ value, label: s.label })),
        get: (r) => r.status,
      },
      {
        id: "payment", label: "Paiement", kind: "select",
        options: Object.entries(PAYMENT_STATUS).map(([value, s]) => ({ value, label: s.label })),
        get: (r) => r.paymentSummary?.paymentStatus,
      },
      { id: "prestation", label: "Prestation", kind: "select", options: optionsFrom(reservations, prestation), get: prestation },
      ...(variant === "stays"
        ? [{ id: "arrivalMode", label: "Arrivée en", kind: "select" as const, options: [{ value: "TRANSPORT", label: "Transport demandé" }, { value: "OWN_VEHICLE", label: "Véhicule perso" }], get: (r: AdminReservation) => r.arrivalMode }]
        : []),
      { id: "arrival", label: variant === "stays" ? "Arrivée" : "Date", kind: "date", get: dateOf },
      { id: "created", label: "Créée", kind: "date", get: (r) => r.createdAt },
    ],
    [reservations, variant],
  );

  const rows = useMemo(() => {
    const filtered = applyFilters(reservations, filterDefs, filterState).filter((r) =>
      matchesSearch(
        [r.userName, r.promoCode, prestation(r), accommodationSummary(r), activitySummary(r), statusOf(r.status).label, paymentStatusOf(r.paymentSummary?.paymentStatus).label, dateOf(r), r.totalAmount],
        query,
      ),
    );
    const sign = sort.dir === "asc" ? 1 : -1;
    const sorted = [...filtered].sort((a, b) => {
      const x = sortValue(a, sort.key);
      const y = sortValue(b, sort.key);
      return (x < y ? -1 : x > y ? 1 : 0) * sign;
    });
    return limit ? sorted.slice(0, limit) : sorted;
  }, [reservations, filterDefs, filterState, query, sort, limit]);

  const size = view === "cards" ? 9 : pageSize;
  const pageCount = Math.max(1, Math.ceil(rows.length / size));
  const current = Math.min(page, pageCount - 1);
  const pageRows = rows.slice(current * size, (current + 1) * size);

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
    setPage(0);
  }

  // One click for the usual case: the guest pays on site, so there is no payment link or deposit to set.
  async function confirmOnSite(r: AdminReservation) {
    setConfirmingId(r.reservationId);
    const res = await fetch(`/api/proxy/reservations/${r.reservationId}/status?status=CONFIRMED`, { method: "PATCH" });
    setConfirmingId(null);
    if (!res.ok) {
      toast.error(await readApiError(res, "Impossible de confirmer la réservation"));
      return;
    }
    toast.success(`Réservation de ${r.userName} confirmée`);
    setViewing(null);
    router.refresh();
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    const res = await fetch(`/api/proxy/reservations/${deleting.reservationId}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      toast.error(await readApiError(res, "Impossible de supprimer la réservation"));
      return;
    }
    toast.success("Réservation supprimée");
    setDeleting(null);
    router.refresh();
  }

  const iconBtn =
    "flex h-8 w-8 items-center justify-center rounded-md text-[15px] text-navy-700/55 transition hover:bg-navy-700/8 hover:text-navy-800";

  const pagerBtn =
    "flex h-7 min-w-7 items-center justify-center rounded-md px-1.5 text-xs font-medium text-navy-700/70 transition hover:bg-navy-700/8 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent";

  return (
    <>
      <div className="card rounded-2xl">
        <div className="flex items-center justify-between gap-3 px-6 pt-4">
          {title ? <h2 className="text-sm font-semibold text-navy-800">{title}</h2> : <span />}
          {!limit && (
            <ViewToggle view={view} onView={(mode) => { setView(mode); setPage(0); }} />
          )}
        </div>
        <TableFilters
          defs={limit ? [] : filterDefs}
          state={filterState}
          onState={(next) => { setFilterState(next); setPage(0); }}
          query={query}
          onQuery={(next) => { setQuery(next); setPage(0); }}
          placeholder="Client, prestation, activité, statut…"
          shown={rows.length}
          total={reservations.length}
        />

        {rows.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-navy-700/45">
            {reservations.length === 0
              ? "Aucune réservation active."
              : "Aucune réservation ne correspond à cette recherche."}
          </p>
        ) : (
          view === "cards" ? (
            <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 2xl:grid-cols-3">
              {pageRows.map((r) => (
                <ReservationCard
                  key={r.reservationId}
                  reservation={r}
                  canDelete={canDelete}
                  confirming={confirmingId === r.reservationId}
                  onConfirm={confirmOnSite}
                  onDelete={setDeleting}
                />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-navy-700/8 bg-navy-700/[0.025] text-left text-[11px] uppercase tracking-wide text-navy-700/50">
                    {columns.map((c) => (
                      <SortHeader
                        key={c.key}
                        label={c.label}
                        sortKey={c.key}
                        sort={sort}
                        onSort={() => toggleSort(c.key)}
                        className={`px-3 py-3 ${c.key === "client" ? "pl-6" : ""}`}
                        right={c.right}
                      />
                    ))}
                    <th className="px-3 py-3 pr-6 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-700/8">
                  {pageRows.map((r) => {
                    const st = statusOf(r.status);
                    return (
                      <tr key={r.reservationId} className="transition hover:bg-gold/[0.06]">
                        <td className="px-3 py-3 pl-6 font-medium text-navy-800">{r.userName}</td>
                        {variant === "stays" ? (
                          <>
                            <td className="px-3 py-3">
                              <div className="font-medium tabular-nums text-navy-800">{guestCounts(r).coming}</div>
                              <div className="text-[12px] text-navy-700/55">{guestBreakdown(r)}</div>
                            </td>
                            <td className="px-3 py-3 text-[13px] text-navy-700/75">{accommodationSummary(r) || "—"}</td>
                            <td className="px-3 py-3 tabular-nums text-navy-700/75">{nightsOf(r) ?? "—"}</td>
                            <td className="px-3 py-3">
                              <span
                                className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-medium ${
                                  r.arrivalMode === "TRANSPORT" ? "bg-sky-100 text-sky-800" : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                <i className={`bi ${r.arrivalMode === "TRANSPORT" ? "bi-truck" : "bi-car-front"}`} aria-hidden />
                                {arrivalLabel(r.arrivalMode)}
                              </span>
                            </td>
                          </>
                        ) : (
                          <td className="px-3 py-3 text-navy-700/75">{prestation(r)}</td>
                        )}
                        <td className="px-3 py-3 text-[13px] text-navy-700/75">{activitySummary(r) || "—"}</td>
                        <td className="px-3 py-3">
                          <div className="flex flex-col items-start gap-1">
                            <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-medium ${st.className}`}>
                              {st.label}
                            </span>
                            <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-medium ${paymentStatusOf(r.paymentSummary?.paymentStatus).className}`}>
                              {paymentStatusOf(r.paymentSummary?.paymentStatus).label}
                            </span>
                            {r.status === "PENDING" && (
                              <button
                                type="button"
                                className="mt-1 inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-emerald-600 px-2.5 py-1 text-[12px] font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                                title="Confirmer la réservation (paiement sur place, sans lien de paiement)"
                                disabled={confirmingId === r.reservationId}
                                onClick={() => confirmOnSite(r)}
                              >
                                <i className="bi bi-check2-circle" aria-hidden />
                                {confirmingId === r.reservationId ? "…" : "Confirmer"}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 tabular-nums text-navy-700/75">{dateOf(r) || "—"}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-right font-medium tabular-nums text-navy-800">
                          {r.totalAmount} {sym(r.currency)}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-end gap-0.5">
                            <button
                              type="button"
                              className={iconBtn}
                              title="Voir"
                              aria-label="Voir"
                              onClick={() => setViewing(r)}
                            >
                              <i className="bi bi-eye" aria-hidden />
                            </button>
                            {isEditable(r.status) ? (
                              <Link
                                href={`/reservations/${r.reservationId}#gestion`}
                                className={iconBtn}
                                title="Modifier"
                                aria-label="Modifier"
                              >
                                <i className="bi bi-pencil" aria-hidden />
                              </Link>
                            ) : (
                              <span
                                className={`${iconBtn} cursor-not-allowed opacity-30 hover:!bg-transparent`}
                                title={`Non modifiable — réservation ${st.label.toLowerCase()}`}
                                aria-label="Non modifiable"
                              >
                                <i className="bi bi-pencil" aria-hidden />
                              </span>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                className={`${iconBtn} hover:!bg-rose/10 hover:!text-rose`}
                                title="Supprimer"
                                aria-label="Supprimer"
                                onClick={() => setDeleting(r)}
                              >
                                <i className="bi bi-trash3" aria-hidden />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}

        {rows.length > size && (
          <div className="flex items-center justify-between gap-3 border-t border-navy-700/8 px-6 py-3 text-xs text-navy-700/55">
            <span>
              {current * size + 1}–{Math.min((current + 1) * size, rows.length)} sur {rows.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className={pagerBtn}
                disabled={current === 0}
                onClick={() => setPage(current - 1)}
                aria-label="Page précédente"
              >
                <i className="bi bi-chevron-left" aria-hidden />
              </button>
              {Array.from({ length: pageCount }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`${pagerBtn} ${i === current ? "!bg-navy-800 !text-white" : ""}`}
                  aria-current={i === current ? "page" : undefined}
                  onClick={() => setPage(i)}
                >
                  {i + 1}
                </button>
              ))}
              <button
                type="button"
                className={pagerBtn}
                disabled={current === pageCount - 1}
                onClick={() => setPage(current + 1)}
                aria-label="Page suivante"
              >
                <i className="bi bi-chevron-right" aria-hidden />
              </button>
            </div>
          </div>
        )}
      </div>

      {viewing && (
        <ReservationQuickView
          reservation={viewing}
          onClose={() => setViewing(null)}
          onConfirm={viewing.status === "PENDING" ? () => confirmOnSite(viewing) : undefined}
          confirming={confirmingId === viewing.reservationId}
        />
      )}

      {deleting && (
        <Modal title="Supprimer la réservation" onClose={() => (busy ? undefined : setDeleting(null))}>
          <p className="text-sm text-navy-700/80">
            La réservation de <strong>{deleting.userName}</strong> ({prestation(deleting)}) sera supprimée
            définitivement. Cette action est irréversible.
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => setDeleting(null)}>
              Annuler
            </button>
            <button type="button" className="btn btn-danger" disabled={busy} onClick={confirmDelete}>
              {busy ? "Suppression…" : "Supprimer"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-navy-700/45">{label}</dt>
      <dd className="mt-0.5 font-medium text-navy-800">{value}</dd>
    </div>
  );
}

const cityLabel = (city: string | null | undefined) => CITY_OPTIONS.find((c) => c.value === city)?.label ?? city ?? "";

/** The details a team member needs at a glance, before opening the full record. */
function ReservationQuickView({
  reservation: r,
  onClose,
  onConfirm,
  confirming,
}: {
  reservation: AdminReservation;
  onClose: () => void;
  onConfirm?: () => void;
  confirming?: boolean;
}) {
  const st = statusOf(r.status);
  const pay = paymentStatusOf(r.paymentSummary?.paymentStatus);
  const currency = sym(r.currency);
  const nights = nightsOf(r);
  const activities = activityLines(r);
  const options = optionLines(r);
  const services = serviceLines(r);
  const returnCity = r.returnCityOther ? `${r.returnCityOther} (hors liste)` : cityLabel(r.returnCity);
  const languages = [...(r.preferredLanguages ?? []).map((l) => l.name), r.otherLanguageRequested].filter(Boolean).join(", ");

  return (
    <Modal title={r.userName} onClose={onClose}>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <Info label="Prestation" value={prestation(r)} />
        <Info label="Statut" value={<span className={`inline-block rounded-full px-2.5 py-0.5 text-[12px] font-medium ${st.className}`}>{st.label}</span>} />
        <Info label="Arrivée" value={r.checkInDate ?? r.serviceDate ?? "—"} />
        <Info label="Départ" value={r.checkOutDate ?? "—"} />
        <Info label="Voyageurs" value={`${guestCounts(r).coming}${guestBreakdown(r) ? ` — ${guestBreakdown(r)}` : ""}`} />
        {nights != null && <Info label="Nuits" value={nights} />}
        {accommodationSummary(r) && <Info label="Hébergement" value={accommodationSummary(r)} />}
        {r.arrivalMode && <Info label="Arrivée en" value={arrivalLabel(r.arrivalMode)} />}
        {r.groupName && <Info label="Groupe" value={r.groupName} />}
        {r.departureCity && <Info label="Ville de départ" value={cityLabel(r.departureCity)} />}
        {returnCity && <Info label="Ville de retour" value={returnCity} />}
        {r.meetUpPlace && <Info label="Rendez-vous" value={r.meetUpPlace} />}
        {languages && <Info label="Langue(s)" value={languages} />}
        <Info
          label="Paiement"
          value={
            <span>
              <span className={`inline-block rounded-full px-2.5 py-0.5 text-[12px] font-medium ${pay.className}`}>{pay.label}</span>
              {r.paymentSummary && (
                <span className="mt-1 block text-[12px] font-normal text-navy-700/60">
                  Payé {r.paymentSummary.totalPaid} {currency} · reste {r.paymentSummary.remainingTotal} {currency}
                </span>
              )}
            </span>
          }
        />
        <Info label="Montant" value={`${r.totalAmount} ${currency}`} />
        {r.promoCode && <Info label="Code promo" value={`${r.promoCode}${r.promoDiscountPercent ? ` (-${r.promoDiscountPercent} %)` : ""}`} />}
      </dl>

      <QuickLines title="Activités choisies" lines={activities} currency={currency} />
      <QuickLines title="Améliorations et options" lines={options} currency={currency} />
      <QuickLines title="Guide, transport et autres services" lines={services} currency={currency} />

      {r.demandeSpecial && (
        <div className="mt-4">
          <div className="text-[11px] uppercase tracking-wide text-navy-700/45">Remarques du client</div>
          <p className="mt-0.5 whitespace-pre-line text-sm text-navy-800">{r.demandeSpecial}</p>
        </div>
      )}

      <p className="mt-4 text-[12px] text-navy-700/45">Créée le {new Date(r.createdAt).toLocaleDateString("fr-FR")}</p>

      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Fermer
        </button>
        {onConfirm && (
          <button type="button" className="btn btn-secondary" disabled={confirming} onClick={onConfirm}>
            {confirming ? "Confirmation…" : "Confirmer (paiement sur place)"}
          </button>
        )}
        <Link href={`/reservations/${r.reservationId}`} className="btn btn-primary">
          Ouvrir la fiche
        </Link>
      </div>
    </Modal>
  );
}

function QuickLines({ title, lines, currency }: { title: string; lines: ReturnType<typeof activityLines>; currency: string }) {
  if (lines.length === 0) return null;
  return (
    <div className="mt-4">
      <div className="text-[11px] uppercase tracking-wide text-navy-700/45">{title}</div>
      <ul className="mt-1 divide-y divide-navy-700/8 rounded-lg border border-navy-700/10">
        {lines.map((line) => (
          <li key={line.reservationExtraId} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
            <span className="text-navy-800">{lineLabel(line)}</span>
            <span className="whitespace-nowrap tabular-nums text-navy-700/70">
              {line.totalPrice != null ? `${line.totalPrice} ${currency}` : "—"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
