"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { inputClass, labelClass } from "@/components/payload/fields";
import type { AdminReservation, AdminTransaction } from "@/lib/api";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "En attente",
  COMPLETED: "Complété",
  FAILED: "Échoué",
  REFUNDED: "Remboursé",
  CANCELLED: "Annulé",
};

const METHOD_LABEL: Record<string, string> = {
  CASH: "Espèces",
  CREDIT_CARD: "Carte de crédit",
  DEBIT_CARD: "Carte de débit",
  BANK_TRANSFER: "Virement",
  ONLINE: "En ligne",
  CHEQUE: "Chèque",
};

// Transactions are immutable financial records once created — the backend
// exposes no PUT/DELETE for them, deliberately (see ARCHITECTURE.md §9 on
// money handling). This list is read + create-a-new-payment only.
export function TransactionsList({ initialItems }: { initialItems: AdminTransaction[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return initialItems;
    const q = query.toLowerCase();
    return initialItems.filter(
      (t) => t.transactionNumber.toLowerCase().includes(q) || t.reservationId.includes(q),
    );
  }, [initialItems, query]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-navy-800">Paiements</h1>
          <p className="mt-1 text-sm text-navy-700/55">{initialItems.length} transaction(s)</p>
        </div>
        <Link
          href="/operations/paiements/new"
          className="rounded-lg bg-gradient-to-br from-gold to-gold-light px-4 py-2.5 text-sm font-bold text-navy-950 shadow-[0_4px_14px_rgba(197,155,61,0.3)] transition hover:shadow-[0_6px_20px_rgba(197,155,61,0.4)]"
        >
          + Enregistrer un paiement
        </Link>
      </div>

      <input
        type="text"
        placeholder="Rechercher par n° de transaction ou réservation…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full max-w-sm rounded-[9px] border border-navy-700/15 bg-white px-3.5 py-2.5 text-[14px] text-navy-800 outline-none transition placeholder:text-navy-700/30 focus:border-gold/60 focus:ring-3 focus:ring-gold/15"
      />

      <div className="card overflow-hidden rounded-2xl">
        {filtered.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-gray-400">Aucun paiement pour le moment.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400">
                  <th className="px-6 py-3 font-medium">N° transaction</th>
                  <th className="px-6 py-3 font-medium">Montant</th>
                  <th className="px-6 py-3 font-medium">Méthode</th>
                  <th className="px-6 py-3 font-medium">Statut</th>
                  <th className="px-6 py-3 font-medium">Réservation</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((t) => (
                  <tr key={t.transactionId} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-800">{t.transactionNumber}</td>
                    <td className="px-6 py-3 text-gray-700">
                      {t.amount.toFixed(3)} {t.currency}
                    </td>
                    <td className="px-6 py-3 text-gray-700">{METHOD_LABEL[t.paymentMethod] ?? t.paymentMethod}</td>
                    <td className="px-6 py-3 text-gray-700">{STATUS_LABEL[t.status] ?? t.status}</td>
                    <td className="px-6 py-3 font-mono text-xs text-gray-500">
                      {t.reservationId.slice(0, 8)}…
                    </td>
                    <td className="px-6 py-3 text-gray-500">
                      {new Date(t.transactionDate).toLocaleString("fr-FR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export function NewPaymentForm({ reservations }: { reservations: AdminReservation[] }) {
  const router = useRouter();
  const [reservationId, setReservationId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [currency, setCurrency] = useState("TND");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reservationId) {
      setError("Choisissez une réservation.");
      return;
    }
    setBusy(true);
    setError("");

    const res = await fetch(`/api/proxy/reservations/${reservationId}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(amount), paymentMethod: method, currency }),
    });

    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message ?? data.error ?? "Une erreur est survenue.");
      return;
    }
    router.push("/operations/paiements");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link
          href="/operations/paiements"
          className="text-sm font-medium text-navy-700/55 hover:text-navy-800"
        >
          ← Paiements
        </Link>
        <h1 className="mt-1 text-xl font-bold text-navy-800">Enregistrer un paiement</h1>
      </div>

      <form onSubmit={onSubmit} className="card flex max-w-md flex-col gap-4 rounded-2xl p-6">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="reservationId" className={labelClass}>
            Réservation
          </label>
          <select
            id="reservationId"
            required
            className={inputClass}
            value={reservationId}
            onChange={(e) => setReservationId(e.target.value)}
          >
            <option value="">— Choisir —</option>
            {reservations.map((r) => (
              <option key={r.reservationId} value={r.reservationId}>
                {r.userName} · {r.reservationType} · {r.totalAmount} {r.currency}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="amount" className={labelClass}>
            Montant
          </label>
          <input
            id="amount"
            type="number"
            step="0.001"
            min={0}
            required
            className={inputClass}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="method" className={labelClass}>
            Méthode
          </label>
          <select id="method" className={inputClass} value={method} onChange={(e) => setMethod(e.target.value)}>
            {Object.entries(METHOD_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="currency" className={labelClass}>
            Devise
          </label>
          <select
            id="currency"
            className={inputClass}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            <option value="TND">TND</option>
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-gradient-to-br from-gold to-gold-light px-4 py-2.5 text-sm font-bold text-navy-950 shadow-[0_4px_14px_rgba(197,155,61,0.3)] transition hover:shadow-[0_6px_20px_rgba(197,155,61,0.4)] disabled:opacity-50"
        >
          {busy ? "Enregistrement…" : "Enregistrer le paiement"}
        </button>

        {error && (
          <div className="rounded-[10px] border border-rose/25 bg-rose/8 px-3 py-2.5 text-[13px] text-rose">
            {error}
          </div>
        )}
      </form>
    </div>
  );
}
