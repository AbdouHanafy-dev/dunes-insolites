import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { getAllInvoices } from "@/lib/api";
import { InvoicesList } from "@/components/crud/InvoicesCrud";

export const metadata: Metadata = { title: "Proformas" };

export default async function ProformasPage() {
  const session = await getSession();
  if (!session) return null;

  const invoices = await getAllInvoices(session.accessToken, "PROFORMA");

  return <InvoicesList title="Proformas" basePath="/operations/proformas" initialItems={invoices} />;
}
