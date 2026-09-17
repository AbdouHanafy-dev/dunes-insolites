import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { getServiceOptionById } from "@/lib/api";
import { ServiceOptionEditor } from "@/components/crud/ServiceOptionsCrud";
import PricingRulesPanel from "@/components/payload/PricingRulesPanel";

export default async function EditServiceOptionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return null;

  const item = await getServiceOptionById(session.accessToken, id);
  if (!item) notFound();

  return (
    <div className="flex flex-col gap-6">
      <ServiceOptionEditor id={id} initialData={item} />
      <PricingRulesPanel resourceApiPath="service-options" resourceId={id} />
    </div>
  );
}
