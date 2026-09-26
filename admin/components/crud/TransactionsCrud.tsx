"use client";

import { useFormIssues } from "@/components/useFormIssues";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/Toast";
import Breadcrumb from "@/components/payload/Breadcrumb";
import { inputClass, labelClass } from "@/components/payload/fields";
import type { AdminReservation, AdminTransaction } from "@/lib/api";
import { sym } from "@/lib/currency";
import TableFilters from "@/components/TableFilters";
import { useTableFilters } from "@/components/useTableFilters";
import { optionsFrom } from "@/lib/tableFilters";

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

  const { filtered, bar } = useTableFilters(
    initialItems,
    [
      { id: "status", label: "Statut", kind: "select", options: Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label })), get: (t) => t.status },
      { id: "method", label: "Méthode", kind: "select", options: Object.entries(METHOD_LABEL).map(([value, label]) => ({ value, label })), get: (t) => t.paymentMethod },
      { id: "currency", label: "Devise", kind: "select", options: optionsFrom(initialItems, (t) => t.currency), get: (t) => t.currency },
      { id: "date", label: "Date", kind: "date", get: (t) => t.transactionDate },
    ],
    (t) => [t.transactionNumber, t.reservationId, t.amount, STATUS_LABEL[t.status], METHOD_LABEL[t.paymentMethod]],
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-navy-800">Paiements</h1>
          <p className="mt-1 text-sm text-navy-700/55">{initialItems.length} transaction(s)</p>
        </div>
        <Link href="/operations/paiements/new" className="btn btn-primary">
          + Enregistrer un paiement
        </Link>
      </div>

      <div className="card overflow-hidden rounded-2xl">
        <TableFilters {...bar} placeholder="N° de transaction, réservation, montant…" />
        {filtered.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-gray-400">Aucun paiement pour le moment.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-700/8 bg-navy-700/[0.025] text-left text-[11px] uppercase tracking-wide text-navy-700/55">
                  <th className="px-6 py-3 font-semibold">N° transaction</th>
                  <th className="px-6 py-3 font-semibold">Montant</th>
                  <th className="px-6 py-3 font-semibold">Méthode</th>
                  <th className="px-6 py-3 font-semibold">Statut</th>
                  <th className="px-6 py-3 font-semibold">Réservation</th>
                  <th className="px-6 py-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((t) => (
                  <tr key={t.transactionId} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-800">{t.transactionNumber}</td>
                    <td className="px-6 py-3 text-gray-700">
                      {t.amount.toFixed(3)} {sym(t.currency)}
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

const NEW_PAYMENT_FIELDS = [
  { key: "reservationId", label: "Réservation", type: "text", required: true },
  { key: "amount", label: "Montant", type: "number", required: true },
  { key: "paymentMethod", label: "Méthode", type: "text" },
  { key: "currency", label: "Devise", type: "text" },
];

export function NewPaymentForm({ reservations }: { reservations: AdminReservation[] }) {
  const router = useRouter();
  const toast = useToast();
  const fi = useFormIssues(NEW_PAYMENT_FIELDS);
  const [reservationId, setReservationId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [currency, setCurrency] = useState("EUR");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    fi.clear();
    const problems = [];
    if (!reservationId) problems.push(fi.issue("reservationId", "aucune réservation sélectionnée — choisissez-en une dans la liste."));
    const value = Number(amount);
    if (amount.trim() === "") problems.push(fi.issue("amount", "champ obligatoire — saisissez le montant."));
    else if (!Number.isFinite(value) || value <= 0) problems.push(fi.issue("amount", `doit être supérieur à zéro (saisi : ${amount}).`));
    if (problems.length > 0) {
      setError("");
      toast.error(fi.local(problems));
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
      const message = await fi.fromResponse(res, "Enregistrement du paiement refusé");
      setError(message);
      toast.error(message);
      return;
    }
    toast.success("Paiement enregistré");
    router.push("/operations/paiements");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Breadcrumb
          items={[{ label: "Paiements", href: "/operations/paiements" }, { label: "Nouveau paiement" }]}
        />
        <h1 className="mt-1 text-xl font-bold text-navy-800">Enregistrer un paiement</h1>
      </div>

      <form onSubmit={onSubmit} noValidate className="card flex max-w-md flex-col gap-4 rounded-2xl p-6">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="reservationId" className={labelClass}>
            Réservation
          </label>
          <select
            id="reservationId"
            required
            className={fi.inputClass("reservationId")}
            value={reservationId}
            onChange={(e) => setReservationId(e.target.value)}
          >
            <option value="">— Choisir —</option>
            {reservations.map((r) => (
              <option key={r.reservationId} value={r.reservationId}>
                {r.userName} · {r.reservationType} · {r.totalAmount} {sym(r.currency)}
              </option>
            ))}
          </select>
          {fi.errs("reservationId")}
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
            className={fi.inputClass("amount")}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          {fi.errs("amount")}
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
            <option value="EUR">€ (EUR)</option>
            <option value="TND">TND</option>
            <option value="USD">$ (USD)</option>
          </select>
        </div>

        <button type="submit" disabled={busy} className="btn btn-primary btn-block">
          {busy ? "Enregistrement…" : "Enregistrer le paiement"}
        </button>

        {fi.issues.length > 0 ? fi.panel() : error && (
          <div className="rounded-[10px] border border-rose/25 bg-rose/8 px-3 py-2.5 text-[13px] text-rose">
            {error}
          </div>
        )}
      </form>
    </div>
  );
}
