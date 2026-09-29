import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { getExtraById } from "@/lib/api";
import { ExtraEditor } from "@/components/crud/ExtrasCrud";
import PricingRulesPanel from "@/components/payload/PricingRulesPanel";
import InventoryRulesPanel from "@/components/availability/InventoryRulesPanel";

export default async function EditExtraPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return null;

  const item = await getExtraById(session.accessToken, id);
  if (!item) notFound();

  return (
    <div className="flex flex-col gap-6">
      <ExtraEditor id={id} initialData={item} />
      {item.category === "ACTIVITY" && <InventoryRulesPanel resourceApiPath="extras" resourceId={id} baseCapacity={item.maxUnitsPerDay} />}
      <PricingRulesPanel resourceApiPath="extras" resourceId={id} basePrice={item.unitPrice} />
    </div>
  );
}
