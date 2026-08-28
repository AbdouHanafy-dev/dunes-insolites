import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { getAllTransactions } from "@/lib/api";
import { TransactionsList } from "@/components/crud/TransactionsCrud";

export const metadata: Metadata = { title: "Paiements" };

export default async function PaymentsPage() {
  const session = await getSession();
  if (!session) return null;

  const transactions = await getAllTransactions(session.accessToken);

  return <TransactionsList initialItems={transactions} />;
}
