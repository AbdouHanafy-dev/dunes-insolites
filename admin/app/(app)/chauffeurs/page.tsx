import type { Metadata } from "next";
import DriverDirectory from "@/components/DriverDirectory";
import { getSession } from "@/lib/session";
import { getDriverProfiles } from "@/lib/api";

export const metadata: Metadata = { title: "Chauffeurs" };

export default async function ChauffeursPage() {
  const session = await getSession();
  if (!session) return null;
  const drivers = await getDriverProfiles(session.accessToken);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-navy-800">Annuaire des chauffeurs</h1>
          <p className="mt-1 text-sm text-navy-700/55">
            Comptes permanents réutilisables pour toutes les réservations.
          </p>
        </div>
        <span className="rounded-full bg-navy-700/8 px-3 py-1.5 text-sm font-semibold text-navy-800">
          {drivers.filter((driver) => driver.active).length} actif{drivers.filter((driver) => driver.active).length === 1 ? "" : "s"}
        </span>
      </div>
      <DriverDirectory initialDrivers={drivers} />
    </div>
  );
}
