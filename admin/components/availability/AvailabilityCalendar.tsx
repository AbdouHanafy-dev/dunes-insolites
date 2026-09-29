"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/Modal";
import { readApiError } from "@/lib/apiError";
import type { AdminTourType, AvailabilityDay } from "@/lib/api";
import DayDetailModal from "./DayDetailModal";
import ExternalBookingModal from "./ExternalBookingModal";

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(month: string, delta: number) {
  const [year, number] = month.split("-").map(Number);
  const date = new Date(year, number - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function buildMonthGrid(month: string, days: AvailabilityDay[]) {
  const [year, number] = month.split("-").map(Number);
  const count = new Date(year, number, 0).getDate();
  const offset = (new Date(year, number - 1, 1).getDay() + 6) % 7;
  const byDate = new Map(days.map((day) => [day.date, day]));
  const cells: Array<AvailabilityDay | null> = Array.from({ length: offset }, () => null);
  for (let day = 1; day <= count; day += 1) {
    const date = `${month}-${String(day).padStart(2, "0")}`;
    cells.push(byDate.get(date) ?? {
      date, reservationCount: 0, adults: 0, children: 0,
      blockId: null, blockNote: null, accommodations: [],
    });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

type VisualStatus = "closed" | "full" | "low" | "available" | "unknown";

function visualStatus(day: AvailabilityDay): VisualStatus {
  if (day.blockId) return "closed";
  if (day.accommodations.some((item) => item.status === "FULL")) return "full";
  if (day.accommodations.some((item) => item.status === "LOW")) return "low";
  if (day.accommodations.length === 0 || day.accommodations.some((item) => item.status === "UNKNOWN")) return "unknown";
  return "available";
}

const DAY_TONE: Record<VisualStatus, string> = {
  closed: "border-l-4 border-slate-400 bg-slate-50",
  full: "border-l-4 border-rose bg-rose/[0.06]",
  low: "border-l-4 border-amber-500 bg-amber-50/70",
  available: "border-l-4 border-emerald bg-emerald/[0.045]",
  unknown: "border-l-4 border-gray-300 bg-gray-50",
};

const STOCK_TONE = {
  AVAILABLE: "bg-emerald/12 text-emerald-800",
  LOW: "bg-amber-100 text-amber-800",
  FULL: "bg-rose/10 text-rose",
  UNKNOWN: "bg-gray-100 text-gray-500",
};

const STATUS_LABEL: Record<VisualStatus, string> = {
  closed: "Fermé", full: "Alerte", low: "Faible", available: "Libre", unknown: "?",
};

export default function AvailabilityCalendar({ tourTypes }: { tourTypes: AdminTourType[] }) {
  const [tourTypeId, setTourTypeId] = useState(tourTypes[0]?.tourTypeId ?? "");
  const [month, setMonth] = useState(currentMonth);
  const [days, setDays] = useState<AvailabilityDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [detailDay, setDetailDay] = useState<AvailabilityDay | null>(null);
  const [externalTarget, setExternalTarget] = useState<AvailabilityDay | null>(null);
  const [blockTarget, setBlockTarget] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const cells = useMemo(() => buildMonthGrid(month, days), [month, days]);
  const today = new Date().toLocaleDateString("en-CA");

  async function reload() {
    if (!tourTypeId) return;
    const response = await fetch(`/api/proxy/availability/calendar?tourTypeId=${tourTypeId}&month=${month}`);
    if (!response.ok) throw new Error("calendar");
    setDays(await response.json());
  }

  useEffect(() => {
    if (!tourTypeId) return;
    let ignore = false;
    Promise.resolve()
      .then(() => {
        setLoading(true);
        setError("");
        return fetch(`/api/proxy/availability/calendar?tourTypeId=${tourTypeId}&month=${month}`);
      })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("calendar")))
      .then((data: AvailabilityDay[]) => { if (!ignore) setDays(data); })
      .catch(() => { if (!ignore) { setError("Impossible de charger le calendrier."); setDays([]); } })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [tourTypeId, month]);

  async function confirmBlock() {
    if (!blockTarget) return;
    setBusy(true); setError("");
    const response = await fetch("/api/proxy/availability/blocks", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tourTypeId, date: blockTarget, note: noteDraft || undefined }),
    });
    setBusy(false);
    if (!response.ok) { setError(await readApiError(response, "Impossible de fermer cette date")); return; }
    setBlockTarget(null); setNoteDraft(""); await reload();
  }

  async function unblock(blockId: string) {
    setBusy(true); setError("");
    const response = await fetch(`/api/proxy/availability/blocks/${blockId}`, { method: "DELETE" });
    setBusy(false);
    if (!response.ok) { setError(await readApiError(response, "Impossible de rouvrir cette date")); return; }
    await reload();
  }

  const openExternalFor = (day: AvailabilityDay | undefined) => {
    if (day?.accommodations.length) setExternalTarget(day);
  };

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-xl font-bold text-navy-800">Disponibilités</h1>
        <p className="mt-1 text-sm text-navy-700/55">Stock réel par nuit et par hébergement, ventes externes comprises.</p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select value={tourTypeId} onChange={(event) => setTourTypeId(event.target.value)} className="rounded-[9px] border border-navy-700/15 bg-surface-alt px-3.5 py-2.5 text-[14px] text-navy-800 outline-none focus:border-gold/60">
            {tourTypes.length === 0 && <option value="">Aucun séjour</option>}
            {tourTypes.map((tour) => <option key={tour.tourTypeId} value={tour.tourTypeId}>{tour.name}</option>)}
          </select>
          <button type="button" disabled={!days.some((day) => day.accommodations.length)} onClick={() => openExternalFor(days.find((day) => day.date === today) ?? days[0])} className="btn btn-primary disabled:opacity-40">+ Réservation externe</button>
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => setMonth((value) => shiftMonth(value, -1))} className="h-9 w-9 rounded-lg border border-navy-700/15">←</button>
          <span className="min-w-40 text-center text-[14px] font-semibold capitalize text-navy-800">{new Date(`${month}-01T00:00:00`).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</span>
          <button type="button" onClick={() => setMonth((value) => shiftMonth(value, 1))} className="h-9 w-9 rounded-lg border border-navy-700/15">→</button>
          <button type="button" onClick={() => setMonth(currentMonth())} className="ml-2 rounded-lg border border-navy-700/15 px-3 py-2 text-[12px]">Aujourd’hui</button>
        </div>
      </div>

      {error && <div className="rounded-[10px] border border-rose/25 bg-rose/8 px-3 py-2.5 text-[13px] text-rose">{error}</div>}

      <div className="card overflow-hidden rounded-2xl">
        {loading ? <p className="px-6 py-16 text-center text-sm text-gray-400">Chargement…</p> : !tourTypeId ? <p className="px-6 py-16 text-center text-sm text-gray-400">Sélectionnez un séjour.</p> : (
          <>
            <div className="grid grid-cols-7 border-b border-navy-700/10 bg-navy-700/[0.025]">
              {WEEKDAYS.map((weekday) => <div key={weekday} className="px-1 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-navy-700/45 md:px-3 md:text-[11px]">{weekday}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-px bg-navy-700/10">
              {cells.map((day, index) => {
                if (!day) return <div key={`empty-${index}`} className="min-h-20 bg-navy-700/[0.025] md:min-h-44" />;
                const tone = visualStatus(day);
                const people = day.adults + day.children;
                return (
                  <article key={day.date} role="button" tabIndex={0} onClick={() => setDetailDay(day)} onKeyDown={(event) => { if (event.key === "Enter") setDetailDay(day); }} className={`relative min-h-20 cursor-pointer p-1.5 md:min-h-44 md:p-3 ${DAY_TONE[tone]}`}>
                    <div className="flex items-start justify-between gap-1">
                      <span className={`flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-[13px] font-semibold ${day.date === today ? "bg-navy-800 text-white" : "text-navy-800"}`}>{Number(day.date.slice(-2))}</span>
                      <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase md:text-[9px] ${tone === "full" ? "bg-rose/10 text-rose" : tone === "low" ? "bg-amber-100 text-amber-800" : tone === "available" ? "bg-emerald/12 text-emerald-800" : "bg-gray-200 text-gray-600"}`}>{STATUS_LABEL[tone]}</span>
                    </div>
                    <div className="mt-2 hidden space-y-1 md:block">
                      {day.accommodations.map((item) => (
                        <div key={item.accommodationTypeId} className={`flex items-center justify-between gap-1 rounded-md px-1.5 py-1 text-[11px] ${STOCK_TONE[item.status]}`}>
                          <span className="truncate font-medium" title={item.name}>{item.name}</span>
                          <strong>{item.availableUnits ?? "?"}/{item.maxUnits ?? "?"}</strong>
                        </div>
                      ))}
                      {!day.accommodations.length && <p className="text-[11px] text-gray-400">Stock non configuré</p>}
                      {!!day.reservationCount && <p className="text-[10px] text-navy-700/50">{day.reservationCount} dossier{day.reservationCount > 1 ? "s" : ""} · {people} pers.</p>}
                    </div>
                    <div className="absolute inset-x-2 bottom-2 hidden gap-1 md:flex">
                      <button type="button" disabled={busy || !day.accommodations.length} onClick={(event) => { event.stopPropagation(); openExternalFor(day); }} className="flex-1 rounded-md border border-navy-700/15 bg-white/80 px-1 py-1 text-[10px] font-semibold disabled:opacity-40">+ Externe</button>
                      <button type="button" disabled={busy} onClick={(event) => { event.stopPropagation(); if (day.blockId) void unblock(day.blockId); else { setBlockTarget(day.date); setNoteDraft(""); } }} className={`flex-1 rounded-md border bg-white/80 px-1 py-1 text-[10px] font-medium ${day.blockId ? "border-navy-700/15 text-navy-700" : "border-rose/20 text-rose"}`}>{day.blockId ? "Rouvrir" : "Fermer"}</button>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-navy-700/55">
        <Legend color="bg-emerald" label="Disponible" /><Legend color="bg-amber-500" label="Stock faible (≤ 25 %)" /><Legend color="bg-rose" label="Au moins un type complet" /><Legend color="bg-gray-300" label="Fermé ou non configuré" />
        <span>Le chiffre indique les unités libres sur le stock total, après les ventes du site et les saisies externes.</span>
      </div>

      {detailDay && <DayDetailModal date={detailDay.date} dateLabel={formatDate(detailDay.date)} closed={!!detailDay.blockId} blockNote={detailDay.blockNote} onClose={() => setDetailDay(null)} onToggleBlock={() => { const day = detailDay; setDetailDay(null); if (day.blockId) void unblock(day.blockId); else setBlockTarget(day.date); }} />}
      {externalTarget && <ExternalBookingModal initialDate={externalTarget.date} accommodations={externalTarget.accommodations} onClose={() => setExternalTarget(null)} onChanged={reload} />}
      {blockTarget && (
        <Modal title={`Fermer le ${formatDate(blockTarget)}`} onClose={() => setBlockTarget(null)}>
          <label className="text-[13px] font-medium text-navy-700/70">Note (optionnel)</label>
          <textarea value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} placeholder="Ex. maintenance du campement" className="mt-1.5 min-h-24 w-full rounded-[9px] border border-navy-700/15 bg-surface-alt px-3.5 py-2.5 text-[14px] outline-none" />
          <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setBlockTarget(null)} className="btn btn-secondary">Annuler</button><button type="button" onClick={confirmBlock} disabled={busy} className="btn btn-danger">{busy ? "…" : "Fermer cette date"}</button></div>
        </Modal>
      )}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="inline-flex items-center gap-2"><span className={`h-3 w-3 rounded ${color}`} />{label}</span>;
}
