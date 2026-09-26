import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { getExtraById } from "@/lib/api";
import { TourOptionEditor } from "@/components/crud/TourOptionsCrud";
import PricingRulesPanel from "@/components/payload/PricingRulesPanel";

export default async function EditTourOptionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return null;

  const item = await getExtraById(session.accessToken, id);
  if (!item) notFound();

  return (
    <div className="flex flex-col gap-6">
      <TourOptionEditor id={id} initialData={item} />
      <PricingRulesPanel resourceApiPath="extras" resourceId={id} />
    </div>
  );
}
