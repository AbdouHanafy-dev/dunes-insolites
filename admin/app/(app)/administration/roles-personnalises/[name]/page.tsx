import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { getCustomRoles, getCustomRolePermissions } from "@/lib/api";
import CustomRoleMatrix from "@/components/roles/CustomRoleMatrix";

type Props = { params: Promise<{ name: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { name } = await params;
  return { title: `Rôle · ${name}` };
}

export default async function CustomRolePage({ params }: Props) {
  const { name } = await params;
  const session = await getSession();
  if (!session) return null;

  const [roles, permissions] = await Promise.all([
    getCustomRoles(session.accessToken),
    getCustomRolePermissions(session.accessToken, name),
  ]);
  const role = roles.find((r) => r.name === name);
  if (!role || !permissions) notFound();

  return <CustomRoleMatrix roleName={role.name} roleLabel={role.label} initialPermissions={permissions} />;
}
