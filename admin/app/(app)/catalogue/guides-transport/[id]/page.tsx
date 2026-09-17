import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { getExtraById } from "@/lib/api";
import { ServiceExtraEditor } from "@/components/crud/ExtrasCrud";
import PricingRulesPanel from "@/components/payload/PricingRulesPanel";

export default async function EditServiceOptionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return null;

  const item = await getExtraById(session.accessToken, id);
  if (!item) notFound();

  return (
    <div className="flex flex-col gap-6">
      <ServiceExtraEditor id={id} initialData={item} />
      <PricingRulesPanel resourceApiPath="extras" resourceId={id} />
    </div>
  );
}
