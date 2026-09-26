"use client";

import { readApiError } from "@/lib/apiError";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";
import Breadcrumb from "@/components/payload/Breadcrumb";
import type { AdminInvoice } from "@/lib/api";
import { sym } from "@/lib/currency";
import TableFilters from "@/components/TableFilters";
import { useTableFilters } from "@/components/useTableFilters";
import { optionsFrom } from "@/lib/tableFilters";

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

  const { filtered, bar } = useTableFilters(
    initialItems,
    [
      { id: "status", label: "Statut", kind: "select", options: Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label })), get: (i) => i.status },
      { id: "payment", label: "Paiement", kind: "select", options: Object.entries(PAYMENT_STATUS_LABEL).map(([value, label]) => ({ value, label })), get: (i) => i.paymentStatus },
      { id: "type", label: "Type", kind: "select", options: optionsFrom(initialItems, (i) => i.invoiceType), get: (i) => i.invoiceType },
      { id: "company", label: "Société", kind: "select", options: optionsFrom(initialItems, (i) => i.companyType), get: (i) => i.companyType },
      { id: "invoiceDate", label: "Date de facture", kind: "date", get: (i) => i.invoiceDate },
      { id: "dueDate", label: "Échéance", kind: "date", get: (i) => i.dueDate },
    ],
    (i) => [i.invoiceNumber, i.userName, i.totalAmount, STATUS_LABEL[i.status], PAYMENT_STATUS_LABEL[i.paymentStatus]],
  );

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-navy-800">{title}</h1>
        <p className="mt-1 text-sm text-navy-700/55">{initialItems.length} document(s)</p>
      </div>

      <div className="card overflow-hidden rounded-2xl">
        <TableFilters {...bar} placeholder="N° de facture, client, montant…" />
        {filtered.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-gray-400">Aucun document pour le moment.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-700/8 bg-navy-700/[0.025] text-left text-[11px] uppercase tracking-wide text-navy-700/55">
                  <th className="px-6 py-3 font-semibold">N°</th>
                  <th className="px-6 py-3 font-semibold">Client</th>
                  <th className="px-6 py-3 font-semibold">Montant TTC</th>
                  <th className="px-6 py-3 font-semibold">Statut</th>
                  <th className="px-6 py-3 font-semibold">Paiement</th>
                  <th className="px-6 py-3 font-semibold">Date</th>
                  <th className="px-6 py-3 font-semibold">Échéance</th>
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
                    <td className="whitespace-nowrap px-6 py-3 text-gray-500">
                      {new Date(inv.invoiceDate).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-gray-500">
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
