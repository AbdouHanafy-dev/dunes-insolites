"use client";

import { readApiError } from "@/lib/apiError";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";
import Breadcrumb from "@/components/payload/Breadcrumb";
import type { AdminInvoice } from "@/lib/api";
import { sym } from "@/lib/currency";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Brouillon",
  SENT: "Envoyée",
  CANCELLED: "Annulée",
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  UNPAID: "Non payée",
  PARTIALLY_PAID: "Partiellement payée",
  PAID: "Payée",
  OVERDUE: "En retard",
  REFUNDED: "Remboursée",
};

// No "create" here, deliberately — a real fiscal document (7% TVA, timbre
// fiscal, a numbered sequence) needs its line items built correctly from a
// reservation, which the existing reservation flow already does. A bare
// admin form re-entering that by hand risks a malformed invoice with no
// safeguard. This is read + the two safe actions the backend exposes
// (send by email, delete a DRAFT). toggle-company-type is intentionally NOT
// exposed here — ARCHITECTURE.md flags it as rewriting an issued invoice's
// legal identity with no status check (critical debt item #2).
export function InvoicesList({
  title,
  basePath,
  initialItems,
}: {
  title: string;
  basePath: string;
  initialItems: AdminInvoice[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return initialItems;
    const q = query.toLowerCase();
    return initialItems.filter(
      (i) => i.invoiceNumber.toLowerCase().includes(q) || (i.userName ?? "").toLowerCase().includes(q),
    );
  }, [initialItems, query]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-navy-800">{title}</h1>
        <p className="mt-1 text-sm text-navy-700/55">{initialItems.length} document(s)</p>
      </div>

      <input
        type="text"
        placeholder="Rechercher par n° ou client…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full max-w-sm rounded-[9px] border border-navy-700/15 bg-white px-3.5 py-2.5 text-[14px] text-navy-800 outline-none transition placeholder:text-navy-700/30 focus:border-gold/60 focus:ring-3 focus:ring-gold/15"
      />

      <div className="card overflow-hidden rounded-2xl">
        {filtered.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-gray-400">Aucun document pour le moment.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400">
                  <th className="px-6 py-3 font-medium">N°</th>
                  <th className="px-6 py-3 font-medium">Client</th>
                  <th className="px-6 py-3 font-medium">Montant TTC</th>
                  <th className="px-6 py-3 font-medium">Statut</th>
                  <th className="px-6 py-3 font-medium">Paiement</th>
                  <th className="px-6 py-3 font-medium">Échéance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((inv) => (
                  <tr
                    key={inv.invoiceId}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => router.push(`${basePath}/${inv.invoiceId}`)}
                  >
                    <td className="px-6 py-3 font-medium text-gray-800">{inv.invoiceNumber}</td>
                    <td className="px-6 py-3 text-gray-700">{inv.userName ?? "—"}</td>
                    <td className="px-6 py-3 text-gray-700">
                      {inv.totalAmount.toFixed(3)} {sym(inv.currency)}
                    </td>
                    <td className="px-6 py-3 text-gray-700">{STATUS_LABEL[inv.status] ?? inv.status}</td>
                    <td className="px-6 py-3 text-gray-700">
                      {PAYMENT_STATUS_LABEL[inv.paymentStatus] ?? inv.paymentStatus}
                    </td>
                    <td className="px-6 py-3 text-gray-500">
                      {new Date(inv.dueDate).toLocaleDateString("fr-FR")}
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

export function InvoiceDetail({ basePath, invoice }: { basePath: string; invoice: AdminInvoice }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const isProforma = invoice.invoiceType === "PROFORMA";
  const sendPath = isProforma ? "send-proforma" : "send-facture";
  const collectionLabel = isProforma ? "Proformas" : "Factures";

  async function onSend() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/proxy/invoices/${invoice.invoiceId}/${sendPath}`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      const message = await readApiError(res, "Envoi impossible");
      setError(message);
      toast.error(message);
      return;
    }
    setSent(true);
    toast.success("Envoyé avec succès");
  }

  async function onDelete() {
    setBusy(true);
    const res = await fetch(`/api/proxy/invoices/${invoice.invoiceId}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const message = await readApiError(res, "Suppression impossible");
      setError(message);
      toast.error(message);
      setDeleteOpen(false);
      return;
    }
    toast.success("Supprimé avec succès");
    router.push(basePath);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Breadcrumb items={[{ label: collectionLabel, href: basePath }, { label: invoice.invoiceNumber }]} />
        <h1 className="mt-1 text-xl font-bold text-navy-800">{invoice.invoiceNumber}</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        <div className="card flex flex-col gap-4 rounded-2xl p-6">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-navy-700/45">Client</dt>
              <dd className="text-navy-800">{invoice.userName ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-navy-700/45">Marque</dt>
              <dd className="text-navy-800">
                {invoice.companyType === "ROUTE_INSOLITE" ? "Route Insolite" : "Dunes Insolites"}
              </dd>
            </div>
            <div>
              <dt className="text-navy-700/45">Date d&apos;émission</dt>
              <dd className="text-navy-800">{new Date(invoice.invoiceDate).toLocaleDateString("fr-FR")}</dd>
            </div>
            <div>
              <dt className="text-navy-700/45">Échéance</dt>
              <dd className="text-navy-800">{new Date(invoice.dueDate).toLocaleDateString("fr-FR")}</dd>
            </div>
            <div>
              <dt className="text-navy-700/45">Montant total</dt>
              <dd className="text-navy-800">
                {invoice.totalAmount.toFixed(3)} {sym(invoice.currency)}
              </dd>
            </div>
            <div>
              <dt className="text-navy-700/45">Payé / restant</dt>
              <dd className="text-navy-800">
                {invoice.paidAmount.toFixed(3)} / {invoice.remainingAmount.toFixed(3)} {sym(invoice.currency)}
              </dd>
            </div>
            <div>
              <dt className="text-navy-700/45">Statut</dt>
              <dd className="text-navy-800">{STATUS_LABEL[invoice.status] ?? invoice.status}</dd>
            </div>
            <div>
              <dt className="text-navy-700/45">Statut de paiement</dt>
              <dd className="text-navy-800">
                {PAYMENT_STATUS_LABEL[invoice.paymentStatus] ?? invoice.paymentStatus}
              </dd>
            </div>
            <div>
              <dt className="text-navy-700/45">Réservation</dt>
              <dd className="font-mono text-xs text-navy-700">{invoice.reservationId}</dd>
            </div>
          </dl>
        </div>

        <aside className="h-fit lg:sticky lg:top-20">
          <div className="card flex flex-col gap-4 rounded-2xl p-5">
            <button type="button" onClick={onSend} disabled={busy} className="btn btn-primary btn-block">
              {busy ? "…" : `Envoyer par e-mail`}
            </button>
            {sent && (
              <div className="rounded-[10px] border border-emerald/25 bg-emerald/8 px-3 py-2.5 text-[13px] text-emerald">
                Envoi en cours.
              </div>
            )}
            {invoice.status === "DRAFT" && (
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="btn btn-danger-outline btn-block"
              >
                Supprimer
              </button>
            )}
            {error && (
              <div className="rounded-[10px] border border-rose/25 bg-rose/8 px-3 py-2.5 text-[13px] text-rose">
                {error}
              </div>
            )}
          </div>
        </aside>
      </div>

      {deleteOpen && (
        <Modal title="Confirmer la suppression" onClose={() => setDeleteOpen(false)}>
          <p className="text-sm text-navy-700/80">Cette action est irréversible.</p>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setDeleteOpen(false)} className="btn btn-secondary">
              Annuler
            </button>
            <button onClick={onDelete} disabled={busy} className="btn btn-danger">
              {busy ? "Suppression…" : "Supprimer"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
