import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { getAllInvoices } from "@/lib/api";
import { InvoicesList } from "@/components/crud/InvoicesCrud";

export const metadata: Metadata = { title: "Factures" };

export default async function FacturesPage() {
  const session = await getSession();
  if (!session) return null;

  const invoices = await getAllInvoices(session.accessToken, "STANDARD");

  return <InvoicesList title="Factures" basePath="/operations/factures" initialItems={invoices} />;
}
