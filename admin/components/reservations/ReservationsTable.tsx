"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";
import type { AdminReservation } from "@/lib/api";
import { isEditable, statusOf } from "./reservationStatus";

const prestation = (r: AdminReservation) => [...r.tourTypes, ...r.tours][0]?.name ?? r.reservationType;
const dateOf = (r: AdminReservation) => r.checkInDate ?? r.serviceDate ?? "";

type SortKey = "client" | "prestation" | "status" | "date" | "created" | "amount";

const COLUMNS: { key: SortKey; label: string; right?: boolean }[] = [
  { key: "client", label: "Client" },
  { key: "prestation", label: "Prestation" },
  { key: "status", label: "Statut" },
  { key: "date", label: "Date" },
  { key: "created", label: "Créée le" },
  { key: "amount", label: "Montant", right: true },
];

function sortValue(r: AdminReservation, key: SortKey): string | number {
  switch (key) {
    case "client":
      return r.userName.toLowerCase();
    case "prestation":
      return prestation(r).toLowerCase();
    case "status":
      return statusOf(r.status).label;
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
}: {
  reservations: AdminReservation[];
  canDelete: boolean;
  /** Optional card heading, shown left of the search box. */
  title?: string;
  pageSize?: number;
  /** Show at most this many rows in total (after search + sort). */
  limit?: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "created", dir: "desc" });
  const [viewing, setViewing] = useState<AdminReservation | null>(null);
  const [deleting, setDeleting] = useState<AdminReservation | null>(null);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(0);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? reservations.filter((r) =>
          [r.userName, prestation(r), statusOf(r.status).label, dateOf(r), String(r.totalAmount)]
            .join(" ")
            .toLowerCase()
            .includes(q),
        )
      : reservations;
    const sign = sort.dir === "asc" ? 1 : -1;
    const sorted = [...filtered].sort((a, b) => {
      const x = sortValue(a, sort.key);
      const y = sortValue(b, sort.key);
      return (x < y ? -1 : x > y ? 1 : 0) * sign;
    });
    return limit ? sorted.slice(0, limit) : sorted;
  }, [reservations, query, sort, limit]);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pageCount - 1);
  const pageRows = rows.slice(current * pageSize, (current + 1) * pageSize);

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
    setPage(0);
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    const res = await fetch(`/api/proxy/reservations/${deleting.reservationId}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.message ?? "Impossible de supprimer la réservation.");
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
        <div className="flex flex-wrap items-center gap-3 border-b border-navy-700/8 px-6 py-3.5">
          {title && <h2 className="mr-auto text-sm font-semibold text-navy-800">{title}</h2>}
          <div className="relative w-full max-w-sm">
            <i
              className="bi bi-search pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-navy-700/40"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Rechercher un client, une prestation, un statut…"
              className="w-full rounded-lg border border-navy-700/15 bg-white py-2 pl-9 pr-3 text-sm text-navy-800 outline-none transition placeholder:text-navy-700/35 focus:border-gold focus:ring-2 focus:ring-gold/25"
            />
          </div>
          {query && (
            <span className="text-xs text-navy-700/50">
              {rows.length} résultat{rows.length === 1 ? "" : "s"}
            </span>
          )}
        </div>

        {rows.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-navy-700/45">
            {reservations.length === 0
              ? "Aucune réservation active."
              : "Aucune réservation ne correspond à cette recherche."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-700/8 bg-navy-700/[0.025] text-left text-[11px] uppercase tracking-wide text-navy-700/50">
                  {COLUMNS.map((c) => {
                    const active = sort.key === c.key;
                    return (
                      <th
                        key={c.key}
                        aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                        className={`px-6 py-3 font-semibold ${c.right ? "text-right" : ""}`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleSort(c.key)}
                          className={`inline-flex items-center gap-1 uppercase tracking-wide transition hover:text-navy-800 ${active ? "text-navy-800" : ""}`}
                        >
                          {c.label}
                          <i
                            className={`bi ${
                              active ? (sort.dir === "asc" ? "bi-caret-up-fill" : "bi-caret-down-fill") : "bi-chevron-expand"
                            } text-[10px] ${active ? "" : "opacity-40"}`}
                            aria-hidden
                          />
                        </button>
                      </th>
                    );
                  })}
                  <th className="px-6 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-700/8">
                {pageRows.map((r) => {
                  const st = statusOf(r.status);
                  return (
                    <tr key={r.reservationId} className="transition hover:bg-gold/[0.06]">
                      <td className="px-6 py-3 font-medium text-navy-800">{r.userName}</td>
                      <td className="px-6 py-3 text-navy-700/75">{prestation(r)}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-[12px] font-medium ${st.className}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-navy-700/75">{dateOf(r) || "—"}</td>
                      <td className="px-6 py-3 text-navy-700/55">{new Date(r.createdAt).toLocaleDateString("fr-FR")}</td>
                      <td className="px-6 py-3 text-right font-medium tabular-nums text-navy-800">
                        {r.totalAmount} {r.currency}
                      </td>
                      <td className="px-6 py-3">
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
        )}

        {rows.length > pageSize && (
          <div className="flex items-center justify-between gap-3 border-t border-navy-700/8 px-6 py-3 text-xs text-navy-700/55">
            <span>
              {current * pageSize + 1}–{Math.min((current + 1) * pageSize, rows.length)} sur {rows.length}
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
        <Modal title={viewing.userName} onClose={() => setViewing(null)}>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <Info label="Prestation" value={prestation(viewing)} />
            <Info
              label="Statut"
              value={
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-[12px] font-medium ${statusOf(viewing.status).className}`}
                >
                  {statusOf(viewing.status).label}
                </span>
              }
            />
            <Info label="Arrivée" value={viewing.checkInDate ?? viewing.serviceDate ?? "—"} />
            <Info label="Départ" value={viewing.checkOutDate ?? "—"} />
            <Info label="Montant" value={`${viewing.totalAmount} ${viewing.currency}`} />
            <Info label="Créée le" value={new Date(viewing.createdAt).toLocaleDateString("fr-FR")} />
          </dl>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setViewing(null)}>
              Fermer
            </button>
            <Link href={`/reservations/${viewing.reservationId}`} className="btn btn-primary">
              Ouvrir la fiche
            </Link>
          </div>
        </Modal>
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
