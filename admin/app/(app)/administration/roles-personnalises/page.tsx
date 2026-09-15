import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { getCustomRoles } from "@/lib/api";
import CustomRolesList from "@/components/roles/CustomRolesList";

export const metadata: Metadata = { title: "Rôles personnalisés" };

export default async function CustomRolesPage() {
  const session = await getSession();
  if (!session) return null;

  const roles = await getCustomRoles(session.accessToken);

  return <CustomRolesList initialItems={roles} />;
}
