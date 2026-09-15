import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { getUserById, getCustomRoles } from "@/lib/api";
import { StaffEditor } from "@/components/crud/StaffCrud";

export default async function EditStaffPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return null;

  const [item, customRoles] = await Promise.all([
    getUserById(session.accessToken, id),
    getCustomRoles(session.accessToken),
  ]);
  if (!item) notFound();

  return <StaffEditor id={id} initialData={item} customRoles={customRoles} />;
}
