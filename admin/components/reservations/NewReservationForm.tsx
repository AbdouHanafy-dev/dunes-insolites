"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import type { AdminTourType, AdminExtra, AdminSource, AdminAccommodationType, AdminUser, AdminTour } from "@/lib/api";

/**
 * Staff-facing "book on behalf of a client" form (phone/walk-in booking) —
 * the "Nouvelle réservation" nav item was a disabled `soon: true` stub
 * until now (backoffice audit, 15 Sep 2026). Posts to the same
 * POST /api/reservations the public site's guest-checkout uses
 * internally (ReservationController - ADMIN/CAMPING already pass its
 * hasAnyRole check), never a separate "admin booking" endpoint that
 * doesn't exist.
 *
 * Covers both real products this platform books manually: Dunes Insolites'
 * HEBERGEMENT (nuitée, optional accommodation tier) and Route Insolite's
 * TOURS (multi-day circuit, referencing the Tour catalog) — Route Insolite
 * has no backoffice of its own yet (R4, unscheduled), so its real circuits
 * are booked from here in the meantime, same shared DB and reservation
 * pipeline (see docs/SPACES-AND-WORKFLOW.md §6). This is the internal admin
 * booking form, not the public vitrine — CLAUDE.md's "no multi-day touring
 * on the Dunes vitrine" rule doesn't reach here.
 *
 * Pricing is never computed here: the server resolves it from the
 * catalog IDs + unit counts this form submits (AccommodationPricingService
 * for HEBERGEMENT, the Tour's own snapshot for TOURS), exactly like every
 * other booking path — this form shows the total only after the server
 * returns it, never a client-side estimate presented as real.
 */

type TierAvailability = { slug: string; name: string; status: "AVAILABLE" | "UNAVAILABLE" | "UNKNOWN"; unitsAvailable: number | null };

type ExtraLine = { extraId: string; quantity: number; activityDate: string };

export default function NewReservationForm({
  tourTypes,
  extras,
  sources,
  tours,
}: {
  tourTypes: AdminTourType[];
  extras: AdminExtra[];
  sources: AdminSource[];
  tours: AdminTour[];
}) {
  const router = useRouter();
  const toast = useToast();

  // ── HEBERGEMENT (nuitée) vs TOURS (circuit Route Insolite) ────────
  const [reservationKind, setReservationKind] = useState<"HEBERGEMENT" | "TOURS">("HEBERGEMENT");

  // ── Client ──────────────────────────────────────────────────────
  const [clientMode, setClientMode] = useState<"search" | "new">("search");
  const [clientQuery, setClientQuery] = useState("");
  const [clientResults, setClientResults] = useState<AdminUser[]>([]);
  const [selectedClient, setSelectedClient] = useState<AdminUser | null>(null);
  const [newClient, setNewClient] = useState({ name: "", email: "", phone: "" });

  useEffect(() => {
    const handle = setTimeout(async () => {
      if (clientMode !== "search" || clientQuery.trim().length < 2 || selectedClient) {
        setClientResults([]);
        return;
      }
      const params = new URLSearchParams({ term: clientQuery, size: "8" });
      params.append("roles", "CLIENT");
      params.append("roles", "PARTENAIRE");
      const res = await fetch(`/api/proxy/users/search?${params.toString()}`);
      if (!res.ok) return;
      const body = (await res.json()) as { content: AdminUser[] };
      setClientResults(body.content);
    }, 300);
    return () => clearTimeout(handle);
  }, [clientQuery, clientMode, selectedClient]);

  // ── Nuitée / accommodation ──────────────────────────────────────
  const [tourTypeId, setTourTypeId] = useState(tourTypes[0]?.tourTypeId ?? "");
  const selectedTourType = tourTypes.find((t) => t.tourTypeId === tourTypeId) ?? null;
  const [accommodations, setAccommodations] = useState<AdminAccommodationType[]>([]);
  const [accommodationId, setAccommodationId] = useState("");
  const [accommodationUnits, setAccommodationUnits] = useState(1);
  const [tierAvailability, setTierAvailability] = useState<TierAvailability[]>([]);

  const today = new Date().toISOString().slice(0, 10);
  const [checkInDate, setCheckInDate] = useState(today);
  const [checkOutDate, setCheckOutDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const nights = useMemo(() => {
    const n = (Date.parse(checkOutDate) - Date.parse(checkInDate)) / 86_400_000;
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [checkInDate, checkOutDate]);

  const [numberOfAdults, setNumberOfAdults] = useState(2);
  const [numberOfChildren, setNumberOfChildren] = useState(0);

  useEffect(() => {
    async function load() {
      setAccommodationId("");
      setAccommodations([]);
      if (reservationKind !== "HEBERGEMENT" || !tourTypeId) return;
      const res = await fetch(`/api/proxy/accommodation-types?tourTypeId=${tourTypeId}`);
      const rows = res.ok ? ((await res.json()) as AdminAccommodationType[]) : [];
      setAccommodations(rows.filter((r) => r.active && r.bookable));
    }
    load();
  }, [reservationKind, tourTypeId]);

  // Advisory only (same shape the public site's own availability check
  // uses, see PublicStayController) - the authoritative guard is the
  // server's row-locked allocate() inside reservation creation itself,
  // same as guest checkout. This just avoids submitting into an obviously
  // sold-out night.
  useEffect(() => {
    async function load() {
      setTierAvailability([]);
      if (reservationKind !== "HEBERGEMENT" || !selectedTourType?.slug || !checkInDate) return;
      const res = await fetch(
        `/api/proxy/public/stays/${selectedTourType.slug}/availability?date=${checkInDate}`,
      );
      const body = res.ok ? ((await res.json()) as { accommodations: TierAvailability[] }) : null;
      setTierAvailability(body?.accommodations ?? []);
    }
    load();
  }, [reservationKind, selectedTourType?.slug, checkInDate]);

  // ── Circuit (Tour, Route Insolite) ─────────────────────────────
  const [tourId, setTourId] = useState(tours[0]?.tourId ?? "");
  const [departureDate, setDepartureDate] = useState(today);

  // ── Extras / source / notes ─────────────────────────────────────
  const [extraLines, setExtraLines] = useState<ExtraLine[]>([]);
  const [sourceId, setSourceId] = useState(sources[0]?.sourceId ?? "");
  const [groupName, setGroupName] = useState("");
  const [demandeSpecial, setDemandeSpecial] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ reservationId: string; totalAmount: number; currency: string } | null>(null);

  function addExtraLine() {
    if (extras.length === 0) return;
    setExtraLines((lines) => [...lines, { extraId: extras[0].extraId, quantity: 1, activityDate: checkInDate }]);
  }
  function updateExtraLine(index: number, patch: Partial<ExtraLine>) {
    setExtraLines((lines) => lines.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }
  function removeExtraLine(index: number) {
    setExtraLines((lines) => lines.filter((_, i) => i !== index));
  }

  // Returns the resolved userId, or a user-facing error string — distinct
  // from "null" so a permission denial (CAMPING can search clients but
  // not create one, see RolePermissionSeeder's own comment on USERS)
  // reads as what it is, not as an empty-fields validation message.
  async function resolveClientId(): Promise<{ userId: string } | { error: string }> {
    if (clientMode === "search") {
      return selectedClient ? { userId: selectedClient.userId } : { error: "Sélectionnez un client existant." };
    }
    if (!newClient.name.trim() || !newClient.email.trim()) {
      return { error: "Nom et email requis pour créer le client." };
    }
    const res = await fetch("/api/proxy/users/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newClient, role: "CLIENT" }),
    });
    if (res.status === 403) {
      return { error: "Vous n'avez pas la permission de créer un nouveau client — utilisez un client existant, ou demandez à un admin." };
    }
    if (!res.ok) {
      return { error: "Création du client impossible — vérifiez que cet email n'est pas déjà utilisé." };
    }
    const created = (await res.json()) as AdminUser;
    return { userId: created.userId };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!sourceId) {
      setError("Sélectionnez une source.");
      return;
    }
    if (reservationKind === "HEBERGEMENT" && (!tourTypeId || nights <= 0)) {
      setError("Vérifiez la nuitée et les dates.");
      return;
    }
    if (reservationKind === "TOURS" && (!tourId || !departureDate)) {
      setError("Sélectionnez un circuit et une date de départ.");
      return;
    }

    setBusy(true);
    const clientResult = await resolveClientId();
    if ("error" in clientResult) {
      setBusy(false);
      setError(clientResult.error);
      return;
    }
    const { userId } = clientResult;

    const body =
      reservationKind === "HEBERGEMENT"
        ? {
            userId,
            sourceId,
            reservationType: "HEBERGEMENT",
            checkInDate,
            checkOutDate,
            numberOfAdults,
            numberOfChildren,
            groupName: groupName.trim() || null,
            demandeSpecial: demandeSpecial.trim() || null,
            tourTypes: [
              {
                tourTypeId,
                numberOfAdults,
                numberOfChildren,
                activityDate: checkInDate,
                ...(accommodationId
                  ? { accommodationTypeId: accommodationId, accommodationUnits }
                  : {}),
              },
            ],
            extras: extraLines.map((l) => ({ extraId: l.extraId, quantity: l.quantity, activityDate: l.activityDate })),
          }
        : {
            userId,
            sourceId,
            reservationType: "TOURS",
            serviceDate: departureDate,
            numberOfAdults,
            numberOfChildren,
            groupName: groupName.trim() || null,
            demandeSpecial: demandeSpecial.trim() || null,
            tours: [{ tourId }],
            extras: extraLines.map((l) => ({ extraId: l.extraId, quantity: l.quantity, activityDate: l.activityDate })),
          };

    const res = await fetch("/api/proxy/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);

    if (!res.ok) {
      const message = await res.json().catch(() => null);
      setError(message?.message ?? "Création impossible — vérifiez les disponibilités et réessayez.");
      return;
    }
    const created = await res.json();
    setResult({ reservationId: created.reservationId, totalAmount: created.totalAmount, currency: created.currency });
    toast.success("Réservation créée.");
  }

  if (result) {
    return (
      <div className="card mx-auto flex max-w-lg flex-col items-center gap-4 rounded-2xl p-10 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-emerald/12 text-2xl text-emerald">✓</span>
        <h1 className="text-xl font-bold text-navy-800">Réservation créée</h1>
        <p className="text-sm text-navy-700/65">
          Montant total : <strong>{result.totalAmount} {result.currency}</strong>
        </p>
        <div className="flex gap-2">
          <button onClick={() => router.push("/reservations")} className="btn btn-secondary">
            Voir les réservations
          </button>
          <button onClick={() => setResult(null)} className="btn btn-primary">
            Nouvelle réservation
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-navy-800">Nouvelle réservation</h1>
        <p className="mt-1 text-sm text-navy-700/55">
          Réservation par téléphone ou au guichet — nuitée à Sabria, ou circuit Route Insolite.
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setReservationKind("HEBERGEMENT")}
            className={reservationKind === "HEBERGEMENT" ? "btn btn-primary btn-sm" : "btn btn-secondary btn-sm"}
          >
            Nuitée (Dunes Insolites)
          </button>
          <button
            type="button"
            onClick={() => setReservationKind("TOURS")}
            disabled={tours.length === 0}
            className={reservationKind === "TOURS" ? "btn btn-primary btn-sm" : "btn btn-secondary btn-sm"}
          >
            Circuit (Route Insolite)
          </button>
        </div>
        {reservationKind === "TOURS" && tours.length === 0 && (
          <p className="mt-2 text-[12px] text-navy-700/50">Aucun circuit actif dans le catalogue.</p>
        )}
      </div>

      {/* ── Client ── */}
      <section className="card rounded-2xl p-5">
        <h2 className="text-[15px] font-bold text-navy-800">Client</h2>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setClientMode("search")}
            className={clientMode === "search" ? "btn btn-primary btn-sm" : "btn btn-secondary btn-sm"}
          >
            Client existant
          </button>
          <button
            type="button"
            onClick={() => setClientMode("new")}
            className={clientMode === "new" ? "btn btn-primary btn-sm" : "btn btn-secondary btn-sm"}
          >
            Nouveau client
          </button>
        </div>

        {clientMode === "search" ? (
          <div className="mt-3">
            {selectedClient ? (
              <div className="flex items-center justify-between rounded-[9px] border border-navy-700/15 bg-navy-700/4 px-3.5 py-2.5">
                <span className="text-sm text-navy-800">
                  <strong>{selectedClient.name}</strong> — {selectedClient.email}
                </span>
                <button type="button" onClick={() => setSelectedClient(null)} className="text-[13px] text-rose">
                  Changer
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Rechercher par nom ou email…"
                  value={clientQuery}
                  onChange={(e) => setClientQuery(e.target.value)}
                  className="w-full rounded-[9px] border border-navy-700/15 bg-white px-3.5 py-2.5 text-[14px] text-navy-800 outline-none focus:border-gold/60 focus:ring-3 focus:ring-gold/15"
                />
                {clientResults.length > 0 && (
                  <div className="mt-2 divide-y divide-gray-100 rounded-[9px] border border-navy-700/15">
                    {clientResults.map((u) => (
                      <button
                        type="button"
                        key={u.userId}
                        onClick={() => {
                          setSelectedClient(u);
                          setClientResults([]);
                        }}
                        className="block w-full px-3.5 py-2.5 text-left text-[13px] hover:bg-navy-700/4"
                      >
                        <strong>{u.name}</strong> — {u.email}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input
              type="text"
              placeholder="Nom"
              value={newClient.name}
              onChange={(e) => setNewClient((c) => ({ ...c, name: e.target.value }))}
              className="rounded-[9px] border border-navy-700/15 bg-white px-3.5 py-2.5 text-[14px] text-navy-800 outline-none focus:border-gold/60 focus:ring-3 focus:ring-gold/15"
            />
            <input
              type="email"
              placeholder="Email"
              value={newClient.email}
              onChange={(e) => setNewClient((c) => ({ ...c, email: e.target.value }))}
              className="rounded-[9px] border border-navy-700/15 bg-white px-3.5 py-2.5 text-[14px] text-navy-800 outline-none focus:border-gold/60 focus:ring-3 focus:ring-gold/15"
            />
            <input
              type="text"
              placeholder="Téléphone"
              value={newClient.phone}
              onChange={(e) => setNewClient((c) => ({ ...c, phone: e.target.value }))}
              className="rounded-[9px] border border-navy-700/15 bg-white px-3.5 py-2.5 text-[14px] text-navy-800 outline-none focus:border-gold/60 focus:ring-3 focus:ring-gold/15"
            />
          </div>
        )}
      </section>

      {/* ── Nuitée ── */}
      {reservationKind === "HEBERGEMENT" && (
      <section className="card rounded-2xl p-5">
        <h2 className="text-[15px] font-bold text-navy-800">Nuitée</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-[13px] text-navy-700/70">
            Type
            <select
              value={tourTypeId}
              onChange={(e) => setTourTypeId(e.target.value)}
              className="mt-1 w-full rounded-[9px] border border-navy-700/15 bg-white px-3.5 py-2.5 text-[14px] text-navy-800 outline-none focus:border-gold/60"
            >
              {tourTypes.map((t) => (
                <option key={t.tourTypeId} value={t.tourTypeId}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[13px] text-navy-700/70">
            Source
            <select
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              className="mt-1 w-full rounded-[9px] border border-navy-700/15 bg-white px-3.5 py-2.5 text-[14px] text-navy-800 outline-none focus:border-gold/60"
            >
              {sources.map((s) => (
                <option key={s.sourceId} value={s.sourceId}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[13px] text-navy-700/70">
            Arrivée
            <input
              type="date"
              value={checkInDate}
              onChange={(e) => setCheckInDate(e.target.value)}
              className="mt-1 w-full rounded-[9px] border border-navy-700/15 bg-white px-3.5 py-2.5 text-[14px] text-navy-800 outline-none focus:border-gold/60"
            />
          </label>
          <label className="text-[13px] text-navy-700/70">
            Départ
            <input
              type="date"
              value={checkOutDate}
              onChange={(e) => setCheckOutDate(e.target.value)}
              className="mt-1 w-full rounded-[9px] border border-navy-700/15 bg-white px-3.5 py-2.5 text-[14px] text-navy-800 outline-none focus:border-gold/60"
            />
          </label>
          <label className="text-[13px] text-navy-700/70">
            Adultes
            <input
              type="number"
              min={0}
              value={numberOfAdults}
              onChange={(e) => setNumberOfAdults(Number(e.target.value))}
              className="mt-1 w-full rounded-[9px] border border-navy-700/15 bg-white px-3.5 py-2.5 text-[14px] text-navy-800 outline-none focus:border-gold/60"
            />
          </label>
          <label className="text-[13px] text-navy-700/70">
            Enfants
            <input
              type="number"
              min={0}
              value={numberOfChildren}
              onChange={(e) => setNumberOfChildren(Number(e.target.value))}
              className="mt-1 w-full rounded-[9px] border border-navy-700/15 bg-white px-3.5 py-2.5 text-[14px] text-navy-800 outline-none focus:border-gold/60"
            />
          </label>
        </div>
        <p className="mt-2 text-[12px] text-navy-700/50">
          {nights > 0 ? `${nights} nuit(s)` : "La date de départ doit être après la date d'arrivée."}
        </p>

        {accommodations.length > 0 && (
          <div className="mt-4 border-t border-navy-700/8 pt-4">
            <label className="text-[13px] text-navy-700/70">
              Hébergement (optionnel — sinon tarif par personne)
              <select
                value={accommodationId}
                onChange={(e) => setAccommodationId(e.target.value)}
                className="mt-1 w-full rounded-[9px] border border-navy-700/15 bg-white px-3.5 py-2.5 text-[14px] text-navy-800 outline-none focus:border-gold/60"
              >
                <option value="">Aucun</option>
                {accommodations.map((a) => {
                  const tier = tierAvailability.find((t) => t.slug === a.slug);
                  const flag =
                    tier?.status === "UNAVAILABLE"
                      ? " — complet"
                      : tier?.status === "AVAILABLE" && tier.unitsAvailable != null
                        ? ` — ${tier.unitsAvailable} libre(s)`
                        : "";
                  return (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.unitPriceTtc} {a.currency}/nuit){flag}
                    </option>
                  );
                })}
              </select>
            </label>
            {accommodationId && (
              <label className="mt-3 block text-[13px] text-navy-700/70">
                Nombre d&apos;unités
                <input
                  type="number"
                  min={1}
                  value={accommodationUnits}
                  onChange={(e) => setAccommodationUnits(Number(e.target.value))}
                  className="mt-1 w-full max-w-[140px] rounded-[9px] border border-navy-700/15 bg-white px-3.5 py-2.5 text-[14px] text-navy-800 outline-none focus:border-gold/60"
                />
              </label>
            )}
          </div>
        )}
      </section>
      )}

      {/* ── Circuit (Route Insolite) ── */}
      {reservationKind === "TOURS" && (
      <section className="card rounded-2xl p-5">
        <h2 className="text-[15px] font-bold text-navy-800">Circuit</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-[13px] text-navy-700/70">
            Circuit
            <select
              value={tourId}
              onChange={(e) => setTourId(e.target.value)}
              className="mt-1 w-full rounded-[9px] border border-navy-700/15 bg-white px-3.5 py-2.5 text-[14px] text-navy-800 outline-none focus:border-gold/60"
            >
              {tours.map((t) => (
                <option key={t.tourId} value={t.tourId}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[13px] text-navy-700/70">
            Source
            <select
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              className="mt-1 w-full rounded-[9px] border border-navy-700/15 bg-white px-3.5 py-2.5 text-[14px] text-navy-800 outline-none focus:border-gold/60"
            >
              {sources.map((s) => (
                <option key={s.sourceId} value={s.sourceId}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[13px] text-navy-700/70">
            Date de départ
            <input
              type="date"
              value={departureDate}
              onChange={(e) => setDepartureDate(e.target.value)}
              className="mt-1 w-full rounded-[9px] border border-navy-700/15 bg-white px-3.5 py-2.5 text-[14px] text-navy-800 outline-none focus:border-gold/60"
            />
          </label>
          <label className="text-[13px] text-navy-700/70">
            Adultes
            <input
              type="number"
              min={0}
              value={numberOfAdults}
              onChange={(e) => setNumberOfAdults(Number(e.target.value))}
              className="mt-1 w-full rounded-[9px] border border-navy-700/15 bg-white px-3.5 py-2.5 text-[14px] text-navy-800 outline-none focus:border-gold/60"
            />
          </label>
          <label className="text-[13px] text-navy-700/70">
            Enfants
            <input
              type="number"
              min={0}
              value={numberOfChildren}
              onChange={(e) => setNumberOfChildren(Number(e.target.value))}
              className="mt-1 w-full rounded-[9px] border border-navy-700/15 bg-white px-3.5 py-2.5 text-[14px] text-navy-800 outline-none focus:border-gold/60"
            />
          </label>
        </div>
        <p className="mt-2 text-[12px] text-navy-700/50">
          Hors nuitées au camp Sabria — celles-ci se réservent séparément si besoin (`ReservationTourHebergement`).
        </p>
      </section>
      )}

      {/* ── Extras ── */}
      <section className="card rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-navy-800">Extras (optionnel)</h2>
          <button type="button" onClick={addExtraLine} className="btn btn-secondary btn-sm">
            + Ajouter
          </button>
        </div>
        {extraLines.length > 0 && (
          <div className="mt-3 flex flex-col gap-2">
            {extraLines.map((line, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <select
                  value={line.extraId}
                  onChange={(e) => updateExtraLine(i, { extraId: e.target.value })}
                  className="rounded-[9px] border border-navy-700/15 bg-white px-3 py-2 text-[13px] text-navy-800 outline-none focus:border-gold/60"
                >
                  {extras.map((ex) => (
                    <option key={ex.extraId} value={ex.extraId}>
                      {ex.name} ({ex.unitPrice} TND)
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={line.quantity}
                  onChange={(e) => updateExtraLine(i, { quantity: Number(e.target.value) })}
                  className="w-20 rounded-[9px] border border-navy-700/15 bg-white px-3 py-2 text-[13px] text-navy-800 outline-none focus:border-gold/60"
                />
                <input
                  type="date"
                  value={line.activityDate}
                  onChange={(e) => updateExtraLine(i, { activityDate: e.target.value })}
                  className="rounded-[9px] border border-navy-700/15 bg-white px-3 py-2 text-[13px] text-navy-800 outline-none focus:border-gold/60"
                />
                <button type="button" onClick={() => removeExtraLine(i)} className="text-[13px] text-rose">
                  Retirer
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Notes ── */}
      <section className="card rounded-2xl p-5">
        <h2 className="text-[15px] font-bold text-navy-800">Détails du groupe (optionnel)</h2>
        <div className="mt-3 flex flex-col gap-3">
          <input
            type="text"
            placeholder="Nom du groupe"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="rounded-[9px] border border-navy-700/15 bg-white px-3.5 py-2.5 text-[14px] text-navy-800 outline-none focus:border-gold/60"
          />
          <textarea
            placeholder="Demande spéciale"
            value={demandeSpecial}
            onChange={(e) => setDemandeSpecial(e.target.value)}
            rows={2}
            className="rounded-[9px] border border-navy-700/15 bg-white px-3.5 py-2.5 text-[14px] text-navy-800 outline-none focus:border-gold/60"
          />
        </div>
      </section>

      {error && (
        <div className="rounded-[10px] border border-rose/25 bg-rose/8 px-4 py-3 text-[13px] text-rose">{error}</div>
      )}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => router.push("/reservations")} className="btn btn-secondary">
          Annuler
        </button>
        <button type="submit" disabled={busy} className="btn btn-primary">
          {busy ? "Création…" : "Créer la réservation"}
        </button>
      </div>
    </form>
  );
}
