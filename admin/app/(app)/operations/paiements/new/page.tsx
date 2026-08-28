import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { getActiveReservations } from "@/lib/api";
import { NewPaymentForm } from "@/components/crud/TransactionsCrud";

export const metadata: Metadata = { title: "Nouveau paiement" };

export default async function NewPaymentPage() {
  const session = await getSession();
  if (!session) return null;

  const result = await getActiveReservations(session.accessToken, 0, 100);

  return <NewPaymentForm reservations={result.content} />;
}
