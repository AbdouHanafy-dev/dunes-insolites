import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { getUserById } from "@/lib/api";
import { StaffEditor } from "@/components/crud/StaffCrud";

export default async function EditStaffPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return null;

  const item = await getUserById(session.accessToken, id);
  if (!item) notFound();

  return <StaffEditor id={id} initialData={item} />;
}
