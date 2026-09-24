"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { inputClass, labelClass } from "@/components/payload/fields";
import type { AdminPaymentPolicy, AdminPaymentSummary, AdminTransaction } from "@/lib/api";
import { paymentStatusOf } from "./reservationStatus";
import { suggestedDeposit } from "./paymentSuggest";
import { sym } from "@/lib/currency";

/**
 * Payment side of a reservation. Two things staff do here, both server-backed:
 *  - send (or resend) the "how to pay" email, in the language the client booked
 *    in. The amount is set per booking (40 of 200, say; pre-filled from the
 *    payment rules in Paramètres) and the server computes what is still due;
 *  - record a payment received outside the app (cash, TPE, transfer...), which
 *    is what moves the payment status to "Acompte reçu" / "Payé" and, unless
 *    unticked, emails the client "payment received, the rest is payable on
 *    site". The status is never set by hand: it follows the recorded amounts.
 */
const METHODS: { value: string; label: string }[] = [
  { value: "CASH", label: "Espèces" },
  { value: "CREDIT_CARD", label: "Carte bancaire (TPE)" },
  { value: "BANK_TRANSFER", label: "Virement" },
  { value: "CHEQUE", label: "Chèque" },
  { value: "ONLINE", label: "En ligne" },
];

const methodLabel = (m: string) => METHODS.find((x) => x.value === m)?.label ?? m;

function policyText(p: AdminPaymentPolicy | null): string {
  if (!p) return "Règles de paiement indisponibles.";
  const when =
    p.deadlineDaysBefore == null
      ? "avant l'arrivée"
      : p.deadlineDaysBefore === 0
        ? "le jour de l'arrivée"
        : `${p.deadlineDaysBefore} jour(s) avant l'arrivée`;
  if (p.depositMode === "NONE") return "Aucun acompte : règlement à l'arrivée.";
  if (p.depositMode === "FULL") return `Paiement intégral demandé ${when}.`;
  return `Acompte de ${p.depositPercent} % demandé ${when}.`;
}

export default function ReservationPaymentPanel({
  reservationId,
  currency,
  summary,
  transactions,
  paymentLink: initialLink,
  depositAmount,
  policy,
  canSend,
}: {
  reservationId: string;
  currency: string;
  summary: AdminPaymentSummary | null;
  transactions: AdminTransaction[];
  paymentLink: string | null;
  /** The amount already set for this booking; null = follow the payment rules. */
  depositAmount: number | null;
  policy: AdminPaymentPolicy | null;
  /** False for terminal reservations - no payment request can be sent for them. */
  canSend: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [link, setLink] = useState(initialLink ?? "");
  const [askAmount, setAskAmount] = useState(
    String(depositAmount ?? suggestedDeposit(policy, summary?.originalTotalAmount ?? 0)),
  );
  const [notify, setNotify] = useState(true);
  const [sending, setSending] = useState(false);
  // null = follow the balance: the field pre-fills with what is still owed
  // (deposit paid online, the rest in cash on site) until someone types.
  const [typedAmount, setAmount] = useState<string | null>(null);
  const [method, setMethod] = useState("CASH");
  const [recording, setRecording] = useState(false);

  const status = paymentStatusOf(summary?.paymentStatus);
  const remaining = summary?.remainingTotal ?? 0;
  const amount = typedAmount ?? (remaining > 0 ? trimMoney(remaining) : "");
  const enteredValue = Number(amount);
  const balanceAfter = amount.trim() !== "" && Number.isFinite(enteredValue) ? round3(remaining - enteredValue) : null;
  const done = transactions.filter((t) => t.status === "COMPLETED");

  async function sendRequest() {
    setSending(true);
    const res = await fetch(`/api/proxy/reservations/${reservationId}/payment-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentLink: link.trim() || null,
        amount: askAmount.trim() === "" ? null : Number(askAmount),
      }),
    });
    setSending(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.message ?? "Envoi impossible.");
      return;
    }
    toast.success(
      data.amountDue > 0
        ? `Demande envoyée à ${data.sentTo} — ${data.amountDue} ${sym(data.currency)} à régler`
        : `Modalités de paiement envoyées à ${data.sentTo}`,
    );
    router.refresh();
  }

  async function recordPayment(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Saisissez un montant supérieur à zéro.");
      return;
    }
    setRecording(true);
    const res = await fetch("/api/proxy/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reservationId, amount: value, currency, paymentMethod: method, notifyClient: notify }),
    });
    setRecording(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(
        res.status === 403 ? "Votre rôle ne permet pas d'enregistrer un paiement." : (data.message ?? "Enregistrement impossible."),
      );
      return;
    }
    toast.success(notify ? "Paiement enregistré — client prévenu par email" : "Paiement enregistré");
    setAmount(null);
    router.refresh();
  }

  return (
    <div className="card flex flex-col gap-5 rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[13px] font-bold uppercase tracking-wide text-navy-700/50">Paiement</h3>
        <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-medium ${status.className}`}>{status.label}</span>
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-3 text-sm">
          <Figure label="Total" value={`${summary.originalTotalAmount} ${sym(currency)}`} />
          <Figure label="Reçu" value={`${summary.totalPaid} ${sym(currency)}`} />
          <Figure label="Reste à payer" value={`${summary.remainingTotal} ${sym(currency)}`} strong />
        </div>
      )}

      {/* Two panels with the same anatomy (title, one-line help, fields, action)
          so labels, inputs and buttons line up across the row. */}
      <div className="grid items-stretch gap-4 lg:grid-cols-2">
        {/* ── Ask the client ── */}
        <div className="flex flex-col gap-4 rounded-xl border border-navy-700/10 bg-navy-700/[0.02] p-4">
          <div>
            <p className="text-[13px] font-semibold text-navy-800">Demander le paiement</p>
            <p className="mt-0.5 min-h-8 text-[12px] leading-4 text-navy-700/55">{policyText(policy)}</p>
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass} htmlFor="askamount">À demander maintenant ({sym(currency)})</label>
            <input
              id="askamount"
              type="number"
              min={0}
              step="0.001"
              className={inputClass}
              value={askAmount}
              onChange={(e) => setAskAmount(e.target.value)}
              disabled={sending || !canSend}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass} htmlFor="paylink">Lien de paiement (optionnel)</label>
            <input
              id="paylink"
              className={inputClass}
              placeholder="https://..."
              value={link}
              onChange={(e) => setLink(e.target.value)}
              disabled={sending || !canSend}
            />
          </div>
          <div className="mt-auto flex items-center gap-3">
            <button type="button" className="btn btn-primary" disabled={sending || !canSend} onClick={sendRequest}>
              <i className="bi bi-send" aria-hidden />
              {sending ? "Envoi…" : initialLink ? "Renvoyer la demande" : "Envoyer la demande"}
            </button>
            {!canSend && <span className="text-[12px] text-navy-700/45">Réservation clôturée.</span>}
          </div>
        </div>

        {/* ── Record what was received ── */}
        <form
          onSubmit={recordPayment}
          className="flex flex-col gap-4 rounded-xl border border-navy-700/10 bg-navy-700/[0.02] p-4"
        >
          <div>
            <p className="text-[13px] font-semibold text-navy-800">Enregistrer un paiement reçu</p>
            <p className="mt-0.5 min-h-8 text-[12px] leading-4 text-navy-700/55">
              À utiliser pour ce que le client a réellement réglé, en ligne ou sur place.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between">
                <label className={labelClass} htmlFor="payamount">Montant ({sym(currency)})</label>
                {remaining > 0 && (
                  <button
                    type="button"
                    className="text-[11px] text-navy-700/55 underline hover:text-navy-800"
                    onClick={() => setAmount(trimMoney(remaining))}
                  >
                    Tout le reste
                  </button>
                )}
              </div>
              <input
                id="payamount"
                type="number"
                min={0}
                step="0.001"
                className={inputClass}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              {balanceAfter !== null && (
                <p className={`text-[12px] ${balanceAfter < 0 ? "text-rose" : "text-navy-700/55"}`}>
                  {balanceAfter < 0
                    ? `Dépasse le reste à payer de ${trimMoney(-balanceAfter)} ${sym(currency)}`
                    : `Reste après ce paiement : ${trimMoney(balanceAfter)} ${sym(currency)}`}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelClass} htmlFor="paymethod">Moyen</label>
              <select id="paymethod" className={inputClass} value={method} onChange={(e) => setMethod(e.target.value)}>
                {METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-navy-700/75">
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
            Prévenir le client par email (paiement reçu, reste à régler sur place)
          </label>
          <div className="mt-auto">
            <button type="submit" className="btn btn-secondary" disabled={recording}>
              <i className="bi bi-cash-coin" aria-hidden />
              {recording ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>

      {done.length > 0 && (
        <div className="border-t border-navy-700/8 pt-3">
          <p className="mb-1 text-[11px] uppercase tracking-wide text-navy-700/45">Paiements reçus</p>
          <ul className="divide-y divide-navy-700/8 text-sm">
            {done.map((t) => (
              <li key={t.transactionId} className="flex items-center justify-between py-1.5">
                <span className="text-navy-700/75">
                  {new Date(t.transactionDate).toLocaleDateString("fr-FR")} · {methodLabel(t.paymentMethod)}
                </span>
                <span className="font-medium tabular-nums text-navy-800">
                  {t.amount} {sym(t.currency)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Amounts are in millimes (3 decimals): round like the server, show without trailing zeros. */
function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function trimMoney(n: number): string {
  return String(round3(n));
}

function Figure({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-navy-700/45">{label}</div>
      <div className={`mt-0.5 tabular-nums ${strong ? "font-bold text-navy-800" : "font-medium text-navy-800"}`}>{value}</div>
    </div>
  );
}
