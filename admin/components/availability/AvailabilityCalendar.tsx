"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/Modal";
import type { AdminTourType, AvailabilityDay } from "@/lib/api";

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year, monthNumber - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function buildMonthGrid(month: string, days: AvailabilityDay[]): Array<AvailabilityDay | null> {
  const [year, monthNumber] = month.split("-").map(Number);
  const numberOfDays = new Date(year, monthNumber, 0).getDate();
  const mondayFirstOffset = (new Date(year, monthNumber - 1, 1).getDay() + 6) % 7;
  const byDate = new Map(days.map((day) => [day.date, day]));
  const cells: Array<AvailabilityDay | null> = Array.from({ length: mondayFirstOffset }, () => null);

  for (let day = 1; day <= numberOfDays; day += 1) {
    const date = `${month}-${String(day).padStart(2, "0")}`;
    cells.push(
      byDate.get(date) ?? {
        date,
        reservationCount: 0,
        adults: 0,
        children: 0,
        blockId: null,
        blockNote: null,
      },
    );
  }

  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function AvailabilityCalendar({ tourTypes }: { tourTypes: AdminTourType[] }) {
  const [tourTypeId, setTourTypeId] = useState(tourTypes[0]?.tourTypeId ?? "");
  const [month, setMonth] = useState(currentMonth);
  const [days, setDays] = useState<AvailabilityDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [blockTarget, setBlockTarget] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const calendarCells = useMemo(() => buildMonthGrid(month, days), [month, days]);
  const today = new Date().toLocaleDateString("en-CA");

  useEffect(() => {
    if (!tourTypeId) return;
    let ignore = false;

    Promise.resolve()
      .then(() => {
        setLoading(true);
        setError("");
        return fetch(`/api/proxy/availability/calendar?tourTypeId=${tourTypeId}&month=${month}`);
      })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("bad response"))))
      .then((data: AvailabilityDay[]) => {
        if (!ignore) setDays(data);
      })
      .catch(() => {
        if (!ignore) {
          setError("Impossible de charger le calendrier.");
          setDays([]);
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [tourTypeId, month]);

  async function reload() {
    if (!tourTypeId) return;
    const response = await fetch(
      `/api/proxy/availability/calendar?tourTypeId=${tourTypeId}&month=${month}`,
    );
    if (response.ok) setDays(await response.json());
  }

  async function confirmBlock() {
    if (!blockTarget) return;
    setBusy(true);
    setError("");
    const response = await fetch("/api/proxy/availability/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tourTypeId, date: blockTarget, note: noteDraft || undefined }),
    });
    setBusy(false);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.message ?? "Impossible de bloquer cette date.");
      return;
    }
    setBlockTarget(null);
    setNoteDraft("");
    await reload();
  }

  async function unblock(blockId: string) {
    setBusy(true);
    setError("");
    const response = await fetch(`/api/proxy/availability/blocks/${blockId}`, { method: "DELETE" });
    setBusy(false);
    if (!response.ok) {
      setError("Impossible de débloquer cette date.");
      return;
    }
    await reload();
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-navy-800">Disponibilités</h1>
        <p className="mt-1 text-sm text-navy-700/55">
          Calendrier mensuel des réservations et des fermetures manuelles par tour.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <select
          value={tourTypeId}
          onChange={(event) => setTourTypeId(event.target.value)}
          className="rounded-[9px] border border-navy-700/15 bg-surface-alt px-3.5 py-2.5 text-[14px] text-navy-800 outline-none focus:border-gold/60"
          aria-label="Tour affiché"
        >
          {tourTypes.length === 0 && <option value="">Aucun tour</option>}
          {tourTypes.map((tourType) => (
            <option key={tourType.tourTypeId} value={tourType.tourTypeId}>
              {tourType.name}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setMonth((value) => shiftMonth(value, -1))}
            className="h-9 w-9 rounded-lg border border-navy-700/15 text-navy-700/70 hover:bg-navy-700/5"
            aria-label="Mois précédent"
          >
            ←
          </button>
          <span className="min-w-40 text-center text-[14px] font-semibold capitalize text-navy-800">
            {new Date(`${month}-01T00:00:00`).toLocaleDateString("fr-FR", {
              month: "long",
              year: "numeric",
            })}
          </span>
          <button
            type="button"
            onClick={() => setMonth((value) => shiftMonth(value, 1))}
            className="h-9 w-9 rounded-lg border border-navy-700/15 text-navy-700/70 hover:bg-navy-700/5"
            aria-label="Mois suivant"
          >
            →
          </button>
          <button
            type="button"
            onClick={() => setMonth(currentMonth())}
            className="ml-2 rounded-lg border border-navy-700/15 px-3 py-2 text-[12px] font-medium text-navy-700 hover:bg-navy-700/5"
          >
            Aujourd&apos;hui
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-[10px] border border-rose/25 bg-rose/8 px-3 py-2.5 text-[13px] text-rose">
          {error}
        </div>
      )}

      <div className="card overflow-hidden rounded-2xl">
        {loading ? (
          <p className="px-6 py-16 text-center text-sm text-gray-400">Chargement…</p>
        ) : !tourTypeId ? (
          <p className="px-6 py-16 text-center text-sm text-gray-400">Sélectionnez un tour.</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              <div className="grid grid-cols-7 border-b border-navy-700/10 bg-navy-700/[0.025]">
                {WEEKDAYS.map((weekday) => (
                  <div
                    key={weekday}
                    className="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-navy-700/45"
                  >
                    {weekday}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-px bg-navy-700/10">
                {calendarCells.map((day, index) => {
                  if (!day) {
                    return (
                      <div
                        key={`empty-${index}`}
                        className="min-h-36 bg-navy-700/[0.025]"
                        aria-hidden="true"
                      />
                    );
                  }

                  const people = day.adults + day.children;
                  const isToday = day.date === today;
                  return (
                    <article
                      key={day.date}
                      className={`relative min-h-36 bg-white p-3 transition-colors hover:bg-gold/[0.035] ${
                        day.blockId ? "bg-rose/[0.035]" : ""
                      }`}
                      aria-label={formatDate(day.date)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={`flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-[13px] font-semibold ${
                            isToday ? "bg-navy-800 text-white" : "text-navy-800"
                          }`}
                        >
                          {Number(day.date.slice(-2))}
                        </span>
                        <span
                          className={`mt-1 h-2 w-2 rounded-full ${day.blockId ? "bg-rose" : "bg-emerald"}`}
                          title={day.blockId ? "Fermé" : "Ouvert"}
                        />
                      </div>

                      <div className="mt-2 space-y-1 text-[12px]">
                        {day.reservationCount > 0 ? (
                          <>
                            <p className="font-semibold text-navy-800">
                              {day.reservationCount} réservation{day.reservationCount > 1 ? "s" : ""}
                            </p>
                            <p
                              className="text-navy-700/55"
                              title={`${day.adults} adultes, ${day.children} enfants`}
                            >
                              {people} personne{people > 1 ? "s" : ""}
                            </p>
                          </>
                        ) : (
                          <p className="text-navy-700/35">Aucune réservation</p>
                        )}
                        {day.blockId && (
                          <p className="line-clamp-2 font-medium text-rose" title={day.blockNote ?? "Date fermée"}>
                            Fermée{day.blockNote ? ` · ${day.blockNote}` : ""}
                          </p>
                        )}
                      </div>

                      <div className="absolute inset-x-3 bottom-3">
                        {day.blockId ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => unblock(day.blockId!)}
                            className="w-full rounded-md border border-navy-700/15 px-2 py-1 text-[11px] font-medium text-navy-700 hover:bg-navy-700/5 disabled:opacity-50"
                          >
                            Rouvrir
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              setBlockTarget(day.date);
                              setNoteDraft("");
                            }}
                            className="w-full rounded-md border border-rose/20 px-2 py-1 text-[11px] font-medium text-rose hover:bg-rose/5 disabled:opacity-50"
                          >
                            Fermer
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-navy-700/55">
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald" /> Ouvert
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-rose" /> Fermé
        </span>
        <span>Les nombres affichés proviennent des réservations réelles.</span>
      </div>

      {blockTarget && (
        <Modal title={`Fermer le ${formatDate(blockTarget)}`} onClose={() => setBlockTarget(null)}>
          <label className="text-[13px] font-medium text-navy-700/70">Note (optionnel)</label>
          <textarea
            value={noteDraft}
            onChange={(event) => setNoteDraft(event.target.value)}
            placeholder="ex. Maintenance du campement"
            className="mt-1.5 min-h-24 w-full rounded-[9px] border border-navy-700/15 bg-surface-alt px-3.5 py-2.5 text-[14px] text-navy-800 outline-none focus:border-gold/60"
          />
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => setBlockTarget(null)} className="btn btn-secondary">
              Annuler
            </button>
            <button type="button" onClick={confirmBlock} disabled={busy} className="btn btn-danger">
              {busy ? "…" : "Fermer cette date"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
