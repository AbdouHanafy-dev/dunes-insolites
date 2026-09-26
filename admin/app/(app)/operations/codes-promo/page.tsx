import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { getPromoCodes } from "@/lib/api";
import PromoCodesManager from "@/components/crud/PromoCodesManager";

export const metadata: Metadata = { title: "Codes promo hôtels" };

export default async function PromoCodesPage() {
  const session = await getSession();
  if (!session) return null;

  const codes = await getPromoCodes(session.accessToken);
  return <PromoCodesManager initialItems={codes} />;
}
