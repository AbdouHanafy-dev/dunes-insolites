import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { getCustomRoles } from "@/lib/api";
import { StaffEditor } from "@/components/crud/StaffCrud";

export const metadata: Metadata = { title: "Nouvel utilisateur" };

export default async function NewStaffPage() {
  const session = await getSession();
  if (!session) return null;

  const customRoles = await getCustomRoles(session.accessToken);

  return <StaffEditor customRoles={customRoles} />;
}
