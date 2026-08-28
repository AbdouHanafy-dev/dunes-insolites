"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import type { AdminTourType, AvailabilityDay } from "@/lib/api";

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}

export default function AvailabilityCalendar({ tourTypes }: { tourTypes: AdminTourType[] }) {
  const [tourTypeId, setTourTypeId] = useState(tourTypes[0]?.tourTypeId ?? "");
  const [month, setMonth] = useState(currentMonth);
  const [days, setDays] = useState<AvailabilityDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [blockTarget, setBlockTarget] = useState<string | null>(null); // date being blocked
  const [noteDraft, setNoteDraft] = useState("");
  const [busy, setBusy] = useState(false);

  // A plain fetch().then() chain, not an async function called synchronously
  // from the effect body — matches the pattern PageBuilder.tsx's own
  // useEffect already uses, and (unlike calling a named async function)
  // doesn't trip react-hooks/set-state-in-effect.
  useEffect(() => {
    if (!tourTypeId) return;
    let ignore = false;
    // setLoading/setError are deferred into the first .then() rather than
    // called synchronously here — a direct setState call in the effect
    // body itself (not inside a promise callback) trips
    // react-hooks/set-state-in-effect.
    Promise.resolve()
      .then(() => {
        setLoading(true);
        setError("");
        return fetch(`/api/proxy/availability/calendar?tourTypeId=${tourTypeId}&month=${month}`);
      })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("bad response"))))
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

  // Reused after a block/unblock mutation — called from click handlers,
  // never from the effect above, so it's fine for this one to be a normal
  // async function.
  async function reload() {
    if (!tourTypeId) return;
    const res = await fetch(`/api/proxy/availability/calendar?tourTypeId=${tourTypeId}&month=${month}`);
    if (res.ok) setDays(await res.json());
  }

  async function confirmBlock() {
    if (!blockTarget) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/proxy/availability/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tourTypeId, date: blockTarget, note: noteDraft || undefined }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message ?? "Impossible de bloquer cette date.");
      return;
    }
    setBlockTarget(null);
    setNoteDraft("");
    reload();
  }

  async function unblock(blockId: string) {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/proxy/availability/blocks/${blockId}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      setError("Impossible de débloquer cette date.");
      return;
    }
    reload();
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-navy-800">Disponibilités</h1>
        <p className="mt-1 text-sm text-navy-700/55">
          Vue opérationnelle par tour — comptage réel des réservations (annulées/refusées exclues) par
          jour, plus un blocage manuel optionnel pour marquer une date indisponible. N&apos;affecte pas la
          réservation en ligne : c&apos;est un outil de visibilité pour l&apos;équipe, pas encore branché au
          parcours de réservation.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={tourTypeId}
          onChange={(e) => setTourTypeId(e.target.value)}
          className="rounded-[9px] border border-navy-700/15 bg-surface-alt px-3.5 py-2.5 text-[14px] text-navy-800 outline-none focus:border-gold/60"
        >
          {tourTypes.length === 0 && <option value="">Aucun tour</option>}
          {tourTypes.map((t) => (
            <option key={t.tourTypeId} value={t.tourTypeId}>
              {t.name}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setMonth((m) => shiftMonth(m, -1))}
            className="h-9 w-9 rounded-lg border border-navy-700/15 text-navy-700/70 hover:bg-navy-700/5"
          >
            ←
          </button>
          <span className="min-w-32 text-center text-[14px] font-medium text-navy-800">
            {new Date(month + "-01T00:00:00").toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
          </span>
          <button
            type="button"
            onClick={() => setMonth((m) => shiftMonth(m, 1))}
            className="h-9 w-9 rounded-lg border border-navy-700/15 text-navy-700/70 hover:bg-navy-700/5"
          >
            →
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
        ) : days.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-gray-400">
            {tourTypeId ? "Aucune donnée pour ce mois." : "Sélectionnez un tour."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400">
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Réservations</th>
                <th className="px-6 py-3 font-medium">Personnes</th>
                <th className="px-6 py-3 font-medium">Statut</th>
                <th className="px-6 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {days.map((day) => (
                <tr key={day.date} className="hover:bg-gray-50">
                  <td className="px-6 py-2.5 text-navy-800">{formatDate(day.date)}</td>
                  <td className="px-6 py-2.5 text-gray-700">{day.reservationCount}</td>
                  <td className="px-6 py-2.5 text-gray-700">
                    {day.adults + day.children > 0 ? `${day.adults + day.children} (${day.adults} ad. · ${day.children} enf.)` : "—"}
                  </td>
                  <td className="px-6 py-2.5">
                    {day.blockId ? (
                      <span className="text-rose" title={day.blockNote ?? ""}>
                        Fermé{day.blockNote ? ` — ${day.blockNote}` : ""}
                      </span>
                    ) : (
                      <span className="text-emerald">Ouvert</span>
                    )}
                  </td>
                  <td className="px-6 py-2.5 text-right">
                    {day.blockId ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => unblock(day.blockId!)}
                        className="rounded-md border border-navy-700/15 px-2.5 py-1.5 text-[11px] font-medium text-navy-700 hover:bg-navy-700/5 disabled:opacity-50"
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
                        className="rounded-md border border-rose/25 px-2.5 py-1.5 text-[11px] font-medium text-rose hover:bg-rose/8 disabled:opacity-50"
                      >
                        Fermer
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {blockTarget && (
        <Modal title={`Fermer le ${formatDate(blockTarget)}`} onClose={() => setBlockTarget(null)}>
          <label className="text-[13px] font-medium text-navy-700/70">Note (optionnel)</label>
          <textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="ex. Maintenance du campement"
            className="mt-1.5 min-h-24 w-full rounded-[9px] border border-navy-700/15 bg-surface-alt px-3.5 py-2.5 text-[14px] text-navy-800 outline-none focus:border-gold/60"
          />
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setBlockTarget(null)}
              className="rounded-lg border border-navy-700/15 px-4 py-2.5 text-sm font-medium text-navy-700 hover:bg-navy-700/5"
            >
              Annuler
            </button>
            <button
              onClick={confirmBlock}
              disabled={busy}
              className="rounded-lg bg-rose px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {busy ? "…" : "Fermer cette date"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
