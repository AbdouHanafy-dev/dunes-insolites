import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { getInvoiceById } from "@/lib/api";
import { InvoiceDetail } from "@/components/crud/InvoicesCrud";

export default async function ProformaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return null;

  const invoice = await getInvoiceById(session.accessToken, id);
  if (!invoice) notFound();

  return <InvoiceDetail basePath="/operations/proformas" invoice={invoice} />;
}
