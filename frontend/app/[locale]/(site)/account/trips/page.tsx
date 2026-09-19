import { getTranslations } from "next-intl/server";
import DriverTripsCalendar from "@/components/DriverTripsCalendar";
import { getSession } from "@/lib/session";
import { getMyTrips } from "@/lib/api";

export default async function DriverTripsPage() {
  const t = await getTranslations("account");
  const session = await getSession();
  if (!session) return null;

  const trips = await getMyTrips(session.accessToken);

  return (
    <div className="book-card">
      <h2>{t("tripsTitle")}</h2>
      <p className="hint">{t("tripsLead")}</p>

      {trips.length === 0 ? (
        <p className="account-empty">{t("tripsEmpty")}</p>
      ) : (
        <DriverTripsCalendar trips={trips} />
      )}
    </div>
  );
}
