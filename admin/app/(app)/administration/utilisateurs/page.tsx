import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { searchStaff } from "@/lib/api";
import { StaffList } from "@/components/crud/StaffCrud";

export const metadata: Metadata = { title: "Utilisateurs" };

export default async function StaffPage() {
  const session = await getSession();
  if (!session) return null;

  const result = await searchStaff(session.accessToken, { size: 100 });

  return <StaffList initialItems={result.content} />;
}
